package expo.modules.lenswidget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.content.ContentValues
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** Handles the 2×3 widget buttons without launching the Lensim activity or its JS runtime. */
class LensWidgetCheckInReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION) return
    val status = intent.getStringExtra(EXTRA_STATUS)?.takeIf { it == "worn" || it == "notWorn" } ?: return
    val widgetId = intent.getIntExtra(EXTRA_WIDGET_ID, -1)
    val pending = goAsync()
    Thread {
      try {
        val date = LensWidgetDates.trackingDay()
        val saved = writeAnswer(context, date, status)
        if (saved) {
          LensWidgetStore.saveAnswer(context, date, status)
          LensWidgetRenderer.updateAll(context)
        } else if (widgetId >= 0) {
          LensWidgetRenderer.updateAll(context)
        }
      } catch (_: Exception) {
        // Keep the last displayed card. The next app open/day update will refresh it from SQLite.
      } finally { pending.finish() }
    }.start()
  }

  /** Returns false only for "Taktım" when no package covers today. All writes are one SQLite transaction. */
  private fun writeAnswer(context: Context, date: String, status: String): Boolean {
    val file = context.getDatabasePath("lens-takip.db")
    if (!file.exists()) return false
    var last: Exception? = null
    for (attempt in 0 until 4) {
      var db: SQLiteDatabase? = null
      try {
        db = SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE)
        db.beginTransactionNonExclusive()
        val cursor = db.rawQuery("SELECT revision, payload FROM app_state WHERE id=1", null)
        val stored = cursor.use {
          if (!it.moveToFirst()) throw IllegalStateException("Lensim state row is missing")
          it.getLong(0) to JSONObject(it.getString(1))
        }
        val storedRevision = stored.first
        val state = stored.second

        val packages = state.optJSONArray("packages") ?: JSONArray()
        val boxes = state.optJSONArray("boxes") ?: JSONArray()
        val active = mutableListOf<Pair<JSONObject, JSONObject?>>()
        for (i in 0 until packages.length()) {
          val pack = packages.optJSONObject(i) ?: continue
          val opened = pack.optString("openedOn")
          val closed = pack.optString("closedOn").takeUnless { it.isBlank() || it == "null" }
          if (opened <= date && (closed == null || date <= closed)) {
            val boxId = pack.optString("boxId")
            var box: JSONObject? = null
            for (j in 0 until boxes.length()) if (boxes.optJSONObject(j)?.optString("id") == boxId) { box = boxes.optJSONObject(j); break }
            active.add(pack to box)
          }
        }
        if (status == "worn" && active.isEmpty()) {
          db.endTransaction(); db.close(); return false
        }

        val daily = state.optJSONArray("dailyStatuses") ?: JSONArray()
        var dailyIndex = -1
        for (i in 0 until daily.length()) if (daily.optJSONObject(i)?.optString("date") == date) { dailyIndex = i; break }
        val dailyRow = if (dailyIndex >= 0) daily.getJSONObject(dailyIndex) else JSONObject().put("id", "widget-${UUID.randomUUID()}").put("date", date)
        dailyRow.put("status", status).put("automatic", false)
        if (dailyIndex >= 0) daily.put(dailyIndex, dailyRow) else daily.put(dailyRow)
        state.put("dailyStatuses", daily)

        val checkIns = state.optJSONArray("checkIns") ?: JSONArray()
        for ((pack, box) in active) {
          val packId = pack.optString("id")
          var index = -1
          for (i in 0 until checkIns.length()) {
            val row = checkIns.optJSONObject(i) ?: continue
            if (row.optString("packageId") == packId && row.optString("date") == date) { index = i; break }
          }
          val old = if (index >= 0) checkIns.getJSONObject(index) else JSONObject()
          val duration = pack.optInt("durationDaysSnapshot", box?.optInt("durationDays", 30) ?: 30)
          var stockUsed = old.optBoolean("stockUsed", old.optString("status") == "worn")
          if (box != null && duration == 1) {
            val remaining = box.optInt("lensesRemaining", 0)
            if (stockUsed && status != "worn") {
              box.put("lensesRemaining", minOf(box.optInt("lensesTotal", remaining), remaining + 1)); stockUsed = false
            } else if (!stockUsed && status == "worn") {
              if (remaining < 1) throw IllegalStateException("No daily lenses remaining")
              box.put("lensesRemaining", remaining - 1); stockUsed = true
            }
          }
          if (index < 0) old.put("id", "widget-${UUID.randomUUID()}-${packId}").put("packageId", packId).put("date", date)
          old.put("status", status).put("automatic", false)
          if (box != null && duration == 1) old.put("stockUsed", stockUsed)
          if (index >= 0) checkIns.put(index, old) else checkIns.put(old)
        }
        state.put("checkIns", checkIns).put("revision", storedRevision + 1)

        val values = ContentValues().apply { put("revision", storedRevision + 1); put("payload", state.toString()) }
        val changed = db.update("app_state", values, "id=1 AND revision=?", arrayOf(storedRevision.toString()))
        if (changed != 1) throw IllegalStateException("Lensim revision changed")
        db.setTransactionSuccessful()
        db.endTransaction(); db.close()
        return true
      } catch (error: Exception) {
        last = error
        try { if (db?.inTransaction() == true) db.endTransaction() } catch (_: Exception) { }
        try { db?.close() } catch (_: Exception) { }
        if (attempt < 3) Thread.sleep(120L * (attempt + 1))
      }
    }
    if (last != null) throw last
    return false
  }

  companion object {
    const val ACTION = "com.teknova.lenstakip.widget.SAVE_DAILY_ANSWER"
    const val EXTRA_STATUS = "status"
    const val EXTRA_WIDGET_ID = "widgetId"
  }
}
