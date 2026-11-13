package expo.modules.lenswidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.Shader
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

class LensSmallWidget : AppWidgetProvider() {
  override fun onUpdate(c: Context, m: AppWidgetManager, ids: IntArray) { LensWidgetRenderer.updateAll(c) }
  override fun onAppWidgetOptionsChanged(c: Context, m: AppWidgetManager, id: Int, options: Bundle) { LensWidgetRenderer.updateAll(c) }
  override fun onDisabled(c: Context) { LensWidgetRenderer.updateAll(c) }
}
class LensMediumWidget : AppWidgetProvider() {
  override fun onUpdate(c: Context, m: AppWidgetManager, ids: IntArray) { LensWidgetRenderer.updateAll(c) }
  override fun onAppWidgetOptionsChanged(c: Context, m: AppWidgetManager, id: Int, options: Bundle) { LensWidgetRenderer.updateAll(c) }
  override fun onDisabled(c: Context) { LensWidgetRenderer.updateAll(c) }
}
class LensDayReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) { LensWidgetRenderer.updateAll(context) }
}

object LensWidgetRenderer {
  private fun color(hex: String) = Color.parseColor(hex)
  fun updateAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val small = manager.getAppWidgetIds(ComponentName(context, LensSmallWidget::class.java))
    val medium = manager.getAppWidgetIds(ComponentName(context, LensMediumWidget::class.java))
    val state = try { JSONObject(context.getSharedPreferences("lens_widget", 0).getString("snapshot", "{}") ?: "{}") } catch (_: Exception) { JSONObject() }
    for (id in small) manager.updateAppWidget(id, render(context, state, manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 110) >= 230))
    for (id in medium) manager.updateAppWidget(id, render(context, state, true))
    val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = PendingIntent.getBroadcast(context, 1701, Intent(context, LensDayReceiver::class.java).setAction("com.teknova.lenstakip.DAY"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    alarm.cancel(pending)
    if (small.isNotEmpty() || medium.isNotEmpty()) {
      val midnight = LensWidgetDates.nextMidnight()
      // Inexact alarm: no exact-alarm permission, and no claim of precise delivery under Doze.
      alarm.setAndAllowWhileIdle(AlarmManager.RTC, midnight, pending)
    }
  }
  private fun label(c: JSONObject, today: String): Pair<String,String> {
    val start = c.getString("start"); val due = c.getString("due")
    val days = LensWidgetDates.daysBetween(today, due)
    return when {
      today < start -> Pair(LensWidgetDates.daysBetween(today,start).toString(), "gün sonra başlayacak")
      days < 0 -> Pair((-days).toString(), "gün geçti")
      c.getJSONObject("plan").getString("kind") == "daily" -> Pair("Bugün", "tek kullanımlık lensin")
      days == 0L -> Pair("Bugün", "değişim günü")
      else -> Pair(days.toString(), "gün kaldı")
    }
  }
  private fun render(context: Context, state: JSONObject, wide: Boolean): RemoteViews {
    val v = RemoteViews(context.packageName, R.layout.lens_widget)
    val settings = state.optJSONObject("settings") ?: JSONObject()
    val modules = state.optJSONObject("modules") ?: JSONObject()
    val systemDark = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
    val dark = settings.optString("mode") == "dark" || (settings.optString("mode", "system") == "system" && systemDark)
    val ink = if(dark) "#F4F0FA" else "#28233A"
    val accent = when(settings.optString("theme")) { "mint" -> "#267257"; "rose" -> "#A14472"; "peach" -> "#A15B31"; "sky" -> "#346CA2"; else -> "#7456C3" }
    val backdrop = when(settings.optString("theme")) { "mint" -> "#E4F6EC"; "rose" -> "#FBEAF3"; "peach" -> "#FFF0E5"; "sky" -> "#E8F3FF"; else -> "#F2EDFF" }
    v.setInt(R.id.lens_root, "setBackgroundColor", color(if(dark) "#211C30" else backdrop))
    for(id in listOf(R.id.lens_value,R.id.lens_label,R.id.lens_due,R.id.lens_summary,R.id.lens_stock)) v.setTextColor(id,color(ink))
    v.setTextColor(R.id.lens_title,color(if(dark) "#CDB8FF" else accent))
    val array = state.optJSONArray("cycles")
    val cycles = mutableListOf<JSONObject>()
    if(array != null) for(i in 0 until array.length()) {
      val c = array.getJSONObject(i)
      if(c.isNull("completed") && (if(modules.optBoolean("separate")) c.optString("profileId") != "both" else c.optString("profileId") == "both")) cycles.add(c)
    }
    cycles.sortBy { it.optString("due") }
    val scope = settings.optString("widgetScope", "summary")
    val selected = cycles.firstOrNull { it.optString("profileId") == scope } ?: cycles.firstOrNull()
    val today = LensWidgetDates.today()
    try {
      if(selected != null) {
        val text = label(selected,today)
        v.setTextViewText(R.id.lens_value,text.first); v.setTextViewText(R.id.lens_label,text.second)
        val due = selected.getString("due"); val start=selected.getString("start")
        v.setTextViewText(R.id.lens_due,"Değişim: " + LensWidgetDates.formatShort(due))
        val total = LensWidgetDates.daysBetween(start,due).coerceAtLeast(1)
        val progress = ((LensWidgetDates.daysBetween(start,today) * 100) / total).toInt().coerceIn(0,100)
        v.setProgressBar(R.id.lens_progress,100,progress,false); v.setViewVisibility(R.id.lens_progress,if(wide) View.VISIBLE else View.GONE)
        if(wide && modules.optBoolean("separate")) {
          v.setViewVisibility(R.id.lens_summary,View.VISIBLE)
          v.setTextViewText(R.id.lens_summary,cycles.joinToString(" · ") { val l=label(it,today); (if(it.optString("profileId")=="left") "Sol: " else "Sağ: ") + l.first + " " + l.second })
        }
      }
    } catch (_: Exception) { v.setTextViewText(R.id.lens_value,"Tarihini"); v.setTextViewText(R.id.lens_label,"uygulamada kontrol et") }
    val mascot = settings.optString("widgetStyle", "mascot") == "mascot" && settings.optString("mascot", "lumi") != "none"
    v.setViewVisibility(R.id.lens_mascot,if(mascot) View.VISIBLE else View.GONE)
    if(mascot) v.setImageViewBitmap(R.id.lens_mascot,face(settings.optString("mascot", "lumi")))
    if(wide && modules.optBoolean("stock") && settings.optBoolean("widgetStock")) {
      v.setViewVisibility(R.id.lens_stock,View.VISIBLE); v.setTextViewText(R.id.lens_stock,"${state.optJSONObject("stock")?.optInt("pieces") ?: 0} lens stokta")
    }
    val intent = Intent(Intent.ACTION_VIEW,Uri.parse("lenstakip:///")).setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    v.setOnClickPendingIntent(R.id.lens_root,PendingIntent.getActivity(context,0,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    return v
  }
  private fun face(variant: String): Bitmap {
    val bitmap=Bitmap.createBitmap(144,144,Bitmap.Config.ARGB_8888); val canvas=Canvas(bitmap); val p=Paint(Paint.ANTI_ALIAS_FLAG)
    val fill=color(when(variant) { "minti" -> "#B9F1D2"; "pufi" -> "#F4C6DE"; else -> "#CFBFFA" })
    p.shader=RadialGradient(48f,38f,100f,Color.WHITE,fill,Shader.TileMode.CLAMP); canvas.drawOval(8f,12f,136f,132f,p); p.shader=null
    p.color=color("#44354E"); canvas.drawOval(43f,61f,51f,74f,p); canvas.drawOval(93f,61f,101f,74f,p)
    p.color=color("#EF9AB2"); p.alpha=100; canvas.drawOval(27f,79f,47f,90f,p); canvas.drawOval(97f,79f,117f,90f,p); p.alpha=255
    p.color=color("#775473"); p.style=Paint.Style.STROKE; p.strokeWidth=3f; p.strokeCap=Paint.Cap.ROUND
    val mouth=Path(); mouth.moveTo(62f,87f); mouth.quadTo(72f,100f,83f,87f); canvas.drawPath(mouth,p)
    return bitmap
  }
}
