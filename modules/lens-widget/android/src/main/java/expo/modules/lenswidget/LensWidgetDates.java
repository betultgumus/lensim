package expo.modules.lenswidget;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.TimeZone;

/** Calendar-only arithmetic also works on Android API 24/25 without java.time. */
public final class LensWidgetDates {
  private LensWidgetDates() {}
  private static Calendar parse(String date) {
    if (!date.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw new IllegalArgumentException("Invalid date");
    Calendar c = new GregorianCalendar(TimeZone.getTimeZone("UTC"));
    c.clear(); c.setLenient(false);
    c.set(Integer.parseInt(date.substring(0,4)), Integer.parseInt(date.substring(5,7))-1, Integer.parseInt(date.substring(8,10)));
    c.getTimeInMillis();
    return c;
  }
  public static String today() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new java.util.Date()); }
  public static long daysBetween(String from, String to) { return (parse(to).getTimeInMillis()-parse(from).getTimeInMillis())/86400000L; }
  public static String formatShort(String date) {
    SimpleDateFormat f = new SimpleDateFormat("d MMM", Locale.forLanguageTag("tr-TR"));
    f.setTimeZone(TimeZone.getTimeZone("UTC")); return f.format(parse(date).getTime());
  }
  public static long nextMidnight() {
    Calendar c=Calendar.getInstance();c.add(Calendar.DATE,1);
    c.set(Calendar.HOUR_OF_DAY,0);c.set(Calendar.MINUTE,0);c.set(Calendar.SECOND,0);c.set(Calendar.MILLISECOND,0);
    return c.getTimeInMillis();
  }
}
