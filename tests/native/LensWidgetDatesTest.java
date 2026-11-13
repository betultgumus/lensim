import expo.modules.lenswidget.LensWidgetDates;
import java.util.TimeZone;
public class LensWidgetDatesTest {
  public static void main(String[] args) {
    for (String zone : new String[]{"Europe/Istanbul","America/New_York","Pacific/Auckland"}) {
      TimeZone.setDefault(TimeZone.getTimeZone(zone));
      assert LensWidgetDates.daysBetween("2026-03-07","2026-03-09")==2;
      assert LensWidgetDates.daysBetween("2026-10-31","2026-11-02")==2;
      assert LensWidgetDates.daysBetween("2028-02-28","2028-03-01")==2;
      assert LensWidgetDates.daysBetween("2026-11-14","2026-11-13")==-1;
      assert LensWidgetDates.formatShort("2026-11-13").startsWith("13");
      long next=LensWidgetDates.nextMidnight();assert next>System.currentTimeMillis();
      java.util.Calendar c=java.util.Calendar.getInstance();c.setTimeInMillis(next);assert c.get(java.util.Calendar.HOUR_OF_DAY)==0;
    }
    boolean rejected=false;try{LensWidgetDates.daysBetween("2026-02-30","2026-03-01");}catch(IllegalArgumentException e){rejected=true;}
    assert rejected;
    System.out.println("Native widget dates: 3 time zones, DST, leap year, overdue, midnight and invalid date passed.");
  }
}
