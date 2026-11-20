package expo.modules.lenswidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Lensim home-screen widgets. All lens rules live in the app (src/domain/widget.ts): it stores one ready card
 * per tracking day, and the providers only pick today's card and draw it.
 * - LensWidgetProvider: 2×1 card with the counter and its status.
 * - LensWidgetTinyProvider: 1×1 tile with only the counter, coloured by the lens state.
 * - LensWidgetActionProvider: 2×3 card with buttons that write answers directly to SQLite.
 */
open class LensWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    LensWidgetRenderer.updateAll(context)
  }

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
    LensWidgetRenderer.update(context, manager, id, LensWidgetRenderer.currentView(context))
  }

  // The day-change alarm is shared: it is kept while a widget of either size is still placed.
  override fun onDisabled(context: Context) {
    LensWidgetRenderer.updateAll(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      LensWidgetRenderer.ACTION_DAY_CHANGED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED -> LensWidgetRenderer.updateAll(context)
    }
  }
}

/** 1×1 counter tile: same data, alarm and tap as the 2×1 card; the renderer picks the layout by provider. */
class LensWidgetTinyProvider : LensWidgetProvider()
class LensWidgetActionProvider : LensWidgetProvider()

/** One day's card, worded by the app. */
internal data class LensWidgetView(
  val mood: String,
  val side: String,
  val count: String,
  val total: String,
  val segments: Int,
  val worn: String,
  val status: String,
  val other: String,
  val otherShort: String,
  val description: String,
  val todayAnswer: String,
  val link: String,
) {
  val empty get() = mood == "empty"

  companion object {
    fun from(json: JSONObject) = LensWidgetView(
      mood = json.optString("mood", "empty"),
      side = json.optString("side"),
      count = json.optString("count"),
      total = json.optString("total"),
      segments = json.optInt("segments", -1),
      worn = json.optString("worn"),
      status = json.optString("status"),
      other = json.optString("other"),
      otherShort = json.optString("otherShort"),
      description = json.optString("description"),
      todayAnswer = json.optString("todayAnswer"),
      // A tap always opens the home screen with the lens case, also for cards saved by an older app version.
      link = HOME_LINK,
    )

    /** Shown before the app has written any data, or after the precomputed days run out. */
    fun placeholder(context: Context): LensWidgetView {
      val open = context.getString(R.string.lens_widget_open_app)
      val hint = context.getString(R.string.lens_widget_open_hint)
      return LensWidgetView("empty", "", "", "", -1, "", open, hint, hint, "Lensim. $open. $hint.", "", HOME_LINK)
    }

    /** Home screen on the lens case (same as HOME_LINK in src/domain/widget.ts). */
    private const val HOME_LINK = "lenstakip:///?page=today"
  }
}

internal object LensWidgetStore {
  private const val PREFS = "lens_widget"
  private const val KEY = "snapshot"

  fun save(context: Context, json: String) {
    JSONObject(json) // Reject malformed data instead of storing it.
    if (!context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).commit()) {
      throw IllegalStateException("Widget verileri kaydedilemedi")
    }
  }

  fun saveAnswer(context: Context, date: String, status: String) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY, null) ?: return
    try {
      val root = JSONObject(raw)
      val day = root.optJSONObject("days")?.optJSONObject(date) ?: return
      day.put("todayAnswer", status)
      prefs.edit().putString(KEY, root.toString()).commit()
    } catch (_: Exception) { }
  }

  fun viewFor(context: Context, day: String): LensWidgetView {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return LensWidgetView.placeholder(context)
    return try {
      JSONObject(raw).optJSONObject("days")?.optJSONObject(day)?.let { LensWidgetView.from(it) } ?: LensWidgetView.placeholder(context)
    } catch (_: Exception) {
      LensWidgetView.placeholder(context)
    }
  }
}

/** Same tracking day as the app: a new day starts at 02.00 local time (src/domain/dates.ts trackingDay). */
internal object LensWidgetDates {
  private const val ROLLOVER_HOUR = 2

  fun trackingDay(now: Calendar = Calendar.getInstance()): String {
    val day = now.clone() as Calendar
    if (day.get(Calendar.HOUR_OF_DAY) < ROLLOVER_HOUR) day.add(Calendar.DAY_OF_MONTH, -1)
    return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(day.time)
  }

  fun nextRollover(now: Calendar = Calendar.getInstance()): Long {
    val next = now.clone() as Calendar
    if (next.get(Calendar.HOUR_OF_DAY) >= ROLLOVER_HOUR) next.add(Calendar.DAY_OF_MONTH, 1)
    next.set(Calendar.HOUR_OF_DAY, ROLLOVER_HOUR)
    next.set(Calendar.MINUTE, 0)
    next.set(Calendar.SECOND, 1)
    next.set(Calendar.MILLISECOND, 0)
    return next.timeInMillis
  }
}

internal object LensWidgetRenderer {
  const val ACTION_DAY_CHANGED = "com.teknova.lenstakip.widget.DAY_CHANGED"

  /** 2×1 card colours per state (same three steps as the app: fresh blue · change near amber · overdue red). */
  private class Look(val card: Int, val tile: Int, val ink: Int, val count: Int, val total: Int, val status: Int)

  private val fresh = Look(R.drawable.lens_widget_card_fresh, R.drawable.lens_widget_tile_fresh, rgb("#10265A"), rgb("#10265A"), rgb("#5D7DB8"), rgb("#10265A"))
  private val nearing = Look(R.drawable.lens_widget_card_nearing, R.drawable.lens_widget_tile_nearing, rgb("#4A2A00"), rgb("#4A2A00"), rgb("#B07A3A"), rgb("#9A4A00"))
  private val overdue = Look(R.drawable.lens_widget_card_overdue, R.drawable.lens_widget_tile_overdue, rgb("#3F1520"), rgb("#C8243B"), rgb("#DA6B7D"), rgb("#C8243B"))

  private fun rgb(hex: String) = Color.parseColor(hex)
  private fun look(mood: String) = when (mood) {
    "nearing" -> nearing
    "overdue" -> overdue
    else -> fresh
  }

  /** Height (dp) used by the counter and status line of the 2×1 card; extra lines are added only while they fit. */
  private const val WIDE_BASE = 40
  private const val WIDE_LINE = 16

  fun currentView(context: Context) = LensWidgetStore.viewFor(context, LensWidgetDates.trackingDay())

  private fun ids(context: Context, manager: AppWidgetManager, provider: Class<*>) =
    manager.getAppWidgetIds(ComponentName(context, provider))

  fun updateAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val all = ids(context, manager, LensWidgetProvider::class.java) + ids(context, manager, LensWidgetTinyProvider::class.java) + ids(context, manager, LensWidgetActionProvider::class.java)
    if (all.isEmpty()) {
      cancelDayChange(context)
      return
    }
    val view = currentView(context)
    for (id in all) update(context, manager, id, view)
    scheduleDayChange(context)
  }

  fun update(context: Context, manager: AppWidgetManager, id: Int, view: LensWidgetView) {
    val provider = manager.getAppWidgetInfo(id)?.provider?.className
    val tiny = provider == LensWidgetTinyProvider::class.java.name
    val action = provider == LensWidgetActionProvider::class.java.name
    // Portrait size: maximum height reported by the launcher.
    val height = manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT).takeIf { it > 0 } ?: 60
    val v = when { action -> renderAction(context, id, view); tiny -> renderTiny(context, view); else -> renderWide(context, view, height) }
    v.setContentDescription(if (action) R.id.action_root else R.id.lens_root, view.description)
    v.setOnClickPendingIntent(if (action) R.id.action_root else R.id.lens_root, openApp(context, id, view.link))
    manager.updateAppWidget(id, v)
  }

  /** 2×1: owl, cycle day and the real worn-day count. The second eye appears only when the launcher gives extra height. */
  private fun renderWide(context: Context, view: LensWidgetView, height: Int): RemoteViews {
    val v = RemoteViews(context.packageName, R.layout.lens_widget_wide)
    val look = look(view.mood)
    v.setInt(R.id.lens_root, "setBackgroundResource", look.card)

    val hasCount = !view.empty && view.count.isNotEmpty()
    v.setViewVisibility(R.id.lens_count, if (hasCount) View.VISIBLE else View.GONE)
    if (hasCount) {
      v.setTextViewText(R.id.lens_count, counter(view, look.total))
      v.setTextColor(R.id.lens_count, look.count)
    }
    line(v, R.id.lens_status, if (hasCount) view.worn else view.status, look.status)

    // Keep the side label out of the compact widget at every height. Extra height may show the second eye.
    val spare = height - WIDE_BASE
    val showOther = view.otherShort.isNotEmpty() && (view.empty || spare >= WIDE_LINE)
    line(v, R.id.lens_other, view.otherShort, look.ink, showOther)
    line(v, R.id.lens_side, "", look.ink, false)
    return v
  }

  /** 1×1: only the counter, white on the state colour. With no package a dash keeps the tile readable. */
  private fun renderTiny(context: Context, view: LensWidgetView): RemoteViews {
    val v = RemoteViews(context.packageName, R.layout.lens_widget_tiny)
    v.setInt(R.id.lens_root, "setBackgroundResource", look(view.mood).tile)
    val hasCount = !view.empty && view.count.isNotEmpty()
    v.setTextViewText(R.id.lens_count, if (hasCount) counter(view, rgb("#D9FFFFFF"), 0.5f) else "–")
    v.setTextColor(R.id.lens_count, Color.WHITE)
    return v
  }

  /** 2×3: the 2×1-style owl/counter card plus direct daily-answer broadcast buttons. */
  private fun renderAction(context: Context, widgetId: Int, view: LensWidgetView): RemoteViews {
    val v = RemoteViews(context.packageName, R.layout.lens_widget_action)
    val look = look(view.mood)
    v.setInt(R.id.action_root, "setBackgroundResource", look.card)
    v.setTextViewText(R.id.action_side, if (view.empty) "Lensim" else view.side)
    v.setTextViewText(R.id.action_count, if (view.empty || view.count.isEmpty()) "–" else counter(view, look.total, 0.55f))
    v.setTextColor(R.id.action_count, look.count)
    val todayText = when (view.todayAnswer) {
      "worn" -> context.getString(R.string.lens_widget_today_wore)
      "notWorn" -> context.getString(R.string.lens_widget_today_did_not_wear)
      "glasses" -> context.getString(R.string.lens_widget_today_glasses)
      else -> if (view.empty) "Önce lens paketi ekle" else "Bugün lens taktın mı?"
    }
    v.setTextViewText(R.id.action_status, todayText)
    val enabled = !view.empty
    v.setViewVisibility(R.id.action_worn, if (enabled) View.VISIBLE else View.INVISIBLE)
    v.setViewVisibility(R.id.action_not_worn, if (enabled) View.VISIBLE else View.INVISIBLE)
    v.setOnClickPendingIntent(R.id.action_worn, answer(context, widgetId, "worn"))
    v.setOnClickPendingIntent(R.id.action_not_worn, answer(context, widgetId, "notWorn"))
    return v
  }

  private fun openApp(context: Context, widgetId: Int, link: String): PendingIntent {
    val open = Intent(Intent.ACTION_VIEW, Uri.parse(link))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(context, widgetId, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun answer(context: Context, widgetId: Int, status: String): PendingIntent {
    val intent = Intent(context, LensWidgetCheckInReceiver::class.java)
      .setAction(LensWidgetCheckInReceiver.ACTION)
      .putExtra(LensWidgetCheckInReceiver.EXTRA_STATUS, status)
      .putExtra(LensWidgetCheckInReceiver.EXTRA_WIDGET_ID, widgetId)
    val requestCode = widgetId * 10 + if (status == "worn") 1 else 2
    return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun line(v: RemoteViews, id: Int, value: String, color: Int, show: Boolean = value.isNotEmpty()) {
    v.setViewVisibility(id, if (show && value.isNotEmpty()) View.VISIBLE else View.GONE)
    if (show && value.isNotEmpty()) {
      v.setTextViewText(id, value)
      v.setTextColor(id, color)
    }
  }

  /** "7/30" with the total smaller and lighter, as in the app's lens case counter. */
  private fun counter(view: LensWidgetView, totalColor: Int, totalScale: Float = 0.6f): CharSequence {
    val text = SpannableString(view.count + view.total)
    if (view.total.isNotEmpty()) {
      val start = view.count.length
      text.setSpan(RelativeSizeSpan(totalScale), start, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      text.setSpan(ForegroundColorSpan(totalColor), start, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
    return text
  }

  /** Inexact alarm at the next 02.00: no exact-alarm permission needed; the 30-minute widget update is the fallback. */
  private fun scheduleDayChange(context: Context) {
    context.getSystemService(AlarmManager::class.java)?.setAndAllowWhileIdle(AlarmManager.RTC, LensWidgetDates.nextRollover(), dayIntent(context))
  }

  fun cancelDayChange(context: Context) {
    context.getSystemService(AlarmManager::class.java)?.cancel(dayIntent(context))
  }

  private fun dayIntent(context: Context) = PendingIntent.getBroadcast(
    context, 0,
    Intent(context, LensWidgetProvider::class.java).setAction(ACTION_DAY_CHANGED),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )
}
