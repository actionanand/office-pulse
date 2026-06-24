import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const appPackage = 'com.actionanand.officepulse.app';
const javaDir = join('android', 'app', 'src', 'main', 'java', ...appPackage.split('.'));
const mainActivityPath = join(javaDir, 'MainActivity.java');
const reminderPluginPath = join(javaDir, 'OfficePulseReminderPlugin.java');
const reminderReceiverPath = join(javaDir, 'OfficePulseReminderReceiver.java');
const manifestPath = join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
const drawableDir = join('android', 'app', 'src', 'main', 'res', 'drawable');
const notificationSmallIconPath = join(drawableDir, 'ic_stat_office_pulse.xml');
const valuesDir = join('android', 'app', 'src', 'main', 'res', 'values');
const colorsPath = join(valuesDir, 'colors.xml');
const stylesPath = join(valuesDir, 'styles.xml');
const lightShellColor = '#F7F8FB';
const darkShellColor = '#111827';
const headerStartColor = '#667EEA';

mkdirSync(javaDir, { recursive: true });
mkdirSync(drawableDir, { recursive: true });
mkdirSync(valuesDir, { recursive: true });

writeFileSync(
  notificationSmallIconPath,
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M4,20h16v2H4zM5,13h4v6H5zM10,8h4v11h-4zM15,4h4v15h-4z" />
</vector>
`,
);

writeFileSync(
  reminderReceiverPath,
  `package ${appPackage};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;

public class OfficePulseReminderReceiver extends BroadcastReceiver {
  public static final String CHANNEL_ID = "office-pulse-logoff-alerts";
  public static final String EXTRA_ID = "id";
  public static final String EXTRA_TITLE = "title";
  public static final String EXTRA_BODY = "body";

  @Override
  public void onReceive(Context context, Intent intent) {
    int id = intent.getIntExtra(EXTRA_ID, 701601);
    String title = intent.getStringExtra(EXTRA_TITLE);
    String body = intent.getStringExtra(EXTRA_BODY);

    if (title == null || title.trim().isEmpty()) {
      title = "Log off reminder";
    }
    if (body == null || body.trim().isEmpty()) {
      body = "Your log off time is coming up.";
    }

    showNotification(context, id, title, body);
  }

  public static void showNotification(Context context, int id, String title, String body) {
    NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) {
      return;
    }

    ensureChannel(manager);
    manager.notify(id, buildNotification(context, title, body, id));
  }

  public static void cancelNotification(Context context, int id) {
    NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.cancel(id);
    }
  }

  public static PendingIntent createPendingIntent(Context context, int id, String title, String body, int flags) {
    Intent intent = new Intent(context, OfficePulseReminderReceiver.class);
    intent.setAction("com.actionanand.officepulse.LOGOFF_REMINDER_" + id);
    intent.putExtra(EXTRA_ID, id);
    intent.putExtra(EXTRA_TITLE, title);
    intent.putExtra(EXTRA_BODY, body);
    return PendingIntent.getBroadcast(context, id, intent, flags);
  }

  private static Notification buildNotification(Context context, String title, String body, int requestCode) {
    Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }
    PendingIntent pendingIntent = launchIntent == null
      ? null
      : PendingIntent.getActivity(context, requestCode, launchIntent, flags);

    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? new Notification.Builder(context, CHANNEL_ID)
      : new Notification.Builder(context);

    builder
      .setSmallIcon(R.drawable.ic_stat_office_pulse)
      .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), context.getApplicationInfo().icon))
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(new Notification.BigTextStyle().bigText(body))
      .setAutoCancel(true)
      .setDefaults(Notification.DEFAULT_ALL)
      .setPriority(Notification.PRIORITY_HIGH)
      .setShowWhen(true)
      .setWhen(System.currentTimeMillis());

    if (pendingIntent != null) {
      builder.setContentIntent(pendingIntent);
    }

    return builder.build();
  }

  private static void ensureChannel(NotificationManager manager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID,
      "Log off alerts",
      NotificationManager.IMPORTANCE_HIGH
    );
    channel.setDescription("Reminders before your calculated Office Pulse log off time");
    channel.enableLights(true);
    channel.setLightColor(Color.rgb(102, 126, 234));
    channel.enableVibration(true);
    manager.createNotificationChannel(channel);
  }
}
`,
);

writeFileSync(
  reminderPluginPath,
  `package ${appPackage};

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONObject;

@CapacitorPlugin(
  name = "OfficePulseReminder",
  permissions = {
    @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
  }
)
public class OfficePulseReminderPlugin extends Plugin {
  private static final int[] REMINDER_IDS = {701601, 701630, 701615};

  @PluginMethod
  public void sendLogoffReminder(PluginCall call) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        && getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      call.reject("Notification permission is not granted.");
      return;
    }

    Integer idValue = call.getInt("id");
    int id = idValue == null ? 701601 : idValue;
    String title = call.getString("title", "Log off reminder");
    String body = call.getString("body", "Your log off time is coming up.");

    try {
      NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
      if (manager == null) {
        call.reject("Notification manager is not available.");
        return;
      }

      OfficePulseReminderReceiver.showNotification(getContext(), id, title, body);

      JSObject result = new JSObject();
      result.put("sent", true);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject("Unable to send log off reminder.");
    }
  }

  @PluginMethod
  public void scheduleLogoffReminders(PluginCall call) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        && getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      call.reject("Notification permission is not granted.");
      return;
    }

    JSArray reminders = call.getArray("reminders");
    if (reminders == null) {
      call.reject("Reminders are required.");
      return;
    }

    AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
    if (alarmManager == null) {
      call.reject("Alarm manager is not available.");
      return;
    }

    try {
      for (int index = 0; index < reminders.length(); index++) {
        JSONObject reminder = reminders.getJSONObject(index);
        int id = reminder.getInt("id");
        long atMillis = reminder.getLong("atMillis");
        String title = reminder.optString("title", "Log off reminder");
        String body = reminder.optString("body", "Your log off time is coming up.");

        cancelAlarm(id);

        if (atMillis > System.currentTimeMillis()) {
          PendingIntent pendingIntent = OfficePulseReminderReceiver.createPendingIntent(
            getContext(),
            id,
            title,
            body,
            pendingIntentFlags()
          );
          scheduleAlarm(alarmManager, atMillis, pendingIntent);
        }
      }

      JSObject result = new JSObject();
      result.put("scheduled", true);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject("Unable to schedule log off reminders.");
    }
  }

  @PluginMethod
  public void cancelLogoffReminders(PluginCall call) {
    for (int id : REMINDER_IDS) {
      cancelAlarm(id);
      OfficePulseReminderReceiver.cancelNotification(getContext(), id);
    }

    call.resolve();
  }

  private void cancelAlarm(int id) {
    AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
    if (alarmManager == null) {
      return;
    }

    PendingIntent pendingIntent = OfficePulseReminderReceiver.createPendingIntent(
      getContext(),
      id,
      "",
      "",
      pendingIntentFlags()
    );
    alarmManager.cancel(pendingIntent);
    pendingIntent.cancel();
  }

  private void scheduleAlarm(AlarmManager alarmManager, long atMillis, PendingIntent pendingIntent) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pendingIntent);
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pendingIntent);
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, atMillis, pendingIntent);
    } else {
      alarmManager.set(AlarmManager.RTC_WAKEUP, atMillis, pendingIntent);
    }
  }

  private int pendingIntentFlags() {
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }
    return flags;
  }
}
`,
);

writeFileSync(
  mainActivityPath,
  `package ${appPackage};

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static final int APP_LIGHT_COLOR = Color.rgb(247, 248, 251);
  private static final int APP_DARK_COLOR = Color.rgb(17, 24, 39);
  private static final int APP_HEADER_COLOR = Color.rgb(102, 126, 234);

  @Override
  public void onCreate(Bundle savedInstanceState) {
    requestWindowFeature(Window.FEATURE_NO_TITLE);
    applySystemBars(false);
    registerPlugin(OfficePulseReminderPlugin.class);
    super.onCreate(savedInstanceState);
    hideNativeTitleBar();
    applySystemBars(false);

    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().addJavascriptInterface(new ThemeBridge(), "OfficePulseAndroid");
    }
  }

  private void hideNativeTitleBar() {
    if (getSupportActionBar() != null) {
      getSupportActionBar().hide();
    }
  }

  private void applySystemBars(boolean darkTheme) {
    Window window = getWindow();
    int shellColor = darkTheme ? APP_DARK_COLOR : APP_LIGHT_COLOR;
    window.setBackgroundDrawable(new ColorDrawable(shellColor));
    window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);

    View decorView = window.getDecorView();
    int systemUiVisibility = decorView.getSystemUiVisibility();

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      window.setStatusBarColor(APP_HEADER_COLOR);
      window.setNavigationBarColor(shellColor);
      View content = window.findViewById(android.R.id.content);

      if (content != null) {
        content.setBackgroundColor(shellColor);
      }
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      systemUiVisibility &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (darkTheme) {
        systemUiVisibility &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      } else {
        systemUiVisibility |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      }
    }

    decorView.setSystemUiVisibility(systemUiVisibility);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.setStatusBarContrastEnforced(false);
      window.setNavigationBarContrastEnforced(false);
    }
  }

  private class ThemeBridge {
    @JavascriptInterface
    public void setTheme(String theme) {
      runOnUiThread(() -> applySystemBars("dark".equals(theme)));
    }
  }
}
`,
);

let manifest = readFileSync(manifestPath, 'utf8');

if (!/android\.permission\.INTERNET/.test(manifest)) {
  manifest = manifest.replace(
    /<manifest([^>]*)>/,
    '<manifest$1>\n    <uses-permission android:name="android.permission.INTERNET" />',
  );
}

if (!/android\.permission\.POST_NOTIFICATIONS/.test(manifest)) {
  manifest = manifest.replace(
    /<manifest([^>]*)>/,
    '<manifest$1>\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  );
}

if (!/android\.permission\.SCHEDULE_EXACT_ALARM/.test(manifest)) {
  manifest = manifest.replace(
    /<manifest([^>]*)>/,
    '<manifest$1>\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />',
  );
}

if (!/OfficePulseReminderReceiver/.test(manifest)) {
  manifest = manifest.replace(
    /<\/application>/,
    '        <receiver android:name=".OfficePulseReminderReceiver" android:exported="false" />\n    </application>',
  );
}

writeFileSync(manifestPath, manifest);

let colors = readOptionalFile(colorsPath);
colors = ensureResourceColor(colors, 'office_pulse_shell_light', lightShellColor);
colors = ensureResourceColor(colors, 'office_pulse_shell_dark', darkShellColor);
colors = ensureResourceColor(colors, 'office_pulse_header', headerStartColor);
writeFileSync(colorsPath, colors);

let styles = readOptionalFile(stylesPath);
const shellStyleItems = [
  ['windowActionBar', 'false'],
  ['windowNoTitle', 'true'],
  ['android:windowActionBar', 'false'],
  ['android:windowNoTitle', 'true'],
  ['android:windowBackground', '@color/office_pulse_shell_light'],
  ['android:statusBarColor', '@color/office_pulse_header'],
  ['android:navigationBarColor', '@color/office_pulse_shell_light'],
  ['android:windowLightStatusBar', 'false'],
  ['android:windowLightNavigationBar', 'true'],
  ['android:windowOptOutEdgeToEdgeEnforcement', 'true'],
];

styles = ensureStyleItems(styles, 'AppTheme', shellStyleItems);
styles = ensureStyleItems(styles, 'AppTheme.NoActionBar', shellStyleItems);
styles = ensureStyleItems(styles, 'AppTheme.NoActionBarLaunch', [
  ...shellStyleItems,
  ['android:background', '@color/office_pulse_shell_light'],
  ['windowSplashScreenBackground', '@color/office_pulse_shell_light'],
  ['postSplashScreenTheme', '@style/AppTheme.NoActionBar'],
]);
writeFileSync(stylesPath, styles);

console.log('Android native shell polish patched for Office Pulse.');

function readOptionalFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '<resources>\n</resources>\n';
  }
}

function ensureResourceColor(source, name, value) {
  const colorPattern = new RegExp(`<color\\s+name="${name}">[^<]*</color>`);
  const colorNode = `<color name="${name}">${value}</color>`;

  if (colorPattern.test(source)) {
    return source.replace(colorPattern, colorNode);
  }

  return source.replace('</resources>', `    ${colorNode}\n</resources>`);
}

function ensureStyleItems(source, styleName, items) {
  if (!new RegExp(`<style\\s+name="${styleName}"`).test(source)) {
    source = source.replace('</resources>', `    <style name="${styleName}">\n    </style>\n</resources>`);
  }

  return items.reduce(
    (updatedSource, [itemName, itemValue]) => ensureStyleItem(updatedSource, styleName, itemName, itemValue),
    source,
  );
}

function ensureStyleItem(source, styleName, itemName, itemValue) {
  const stylePattern = new RegExp(`(<style\\s+name="${styleName}"[^>]*>)([\\s\\S]*?)(</style>)`);

  return source.replace(stylePattern, (_match, openTag, styleBody, closeTag) => {
    const itemPattern = new RegExp(`\\s*<item\\s+name="${escapeRegExp(itemName)}">[^<]*</item>`);
    const itemNode = `        <item name="${itemName}">${itemValue}</item>`;
    const nextBody = itemPattern.test(styleBody)
      ? styleBody.replace(itemPattern, `\n${itemNode}`)
      : `${styleBody.trimEnd()}\n${itemNode}\n    `;

    return `${openTag}${nextBody}${closeTag}`;
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
