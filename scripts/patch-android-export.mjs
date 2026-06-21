import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const appPackage = 'com.actionanand.officepulse.app';
const javaDir = join('android', 'app', 'src', 'main', 'java', ...appPackage.split('.'));
const mainActivityPath = join(javaDir, 'MainActivity.java');
const exportPluginPath = join(javaDir, 'OfficePulseExportPlugin.java');
const manifestPath = join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
const filePathsPath = join('android', 'app', 'src', 'main', 'res', 'xml', 'office_pulse_file_paths.xml');

mkdirSync(javaDir, { recursive: true });
mkdirSync(dirname(filePathsPath), { recursive: true });

writeFileSync(
  exportPluginPath,
  `package ${appPackage};

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "OfficePulseExport")
public class OfficePulseExportPlugin extends Plugin {
  private static final int PAGE_WIDTH = 595;
  private static final int PAGE_HEIGHT = 842;

  @PluginMethod
  public void exportPdf(PluginCall call) {
    String filename = call.getString("filename");
    String html = call.getString("html");
    String title = call.getString("title", "Office Pulse PDF Export");

    if (filename == null || filename.trim().isEmpty()) {
      call.reject("A filename is required.");
      return;
    }
    if (html == null || html.trim().isEmpty()) {
      call.reject("PDF content is required.");
      return;
    }

    getActivity().runOnUiThread(() -> renderPdf(call, sanitizeFileName(filename), html, title));
  }

  private void renderPdf(PluginCall call, String filename, String html, String title) {
    try {
      File exportDir = new File(getContext().getCacheDir(), "exports");
      if (!exportDir.exists() && !exportDir.mkdirs()) {
        call.reject("Unable to prepare export folder.");
        return;
      }

      if (!filename.toLowerCase().endsWith(".pdf")) {
        filename = filename + ".pdf";
      }

      File outputFile = new File(exportDir, filename);
      WebView webView = new WebView(getContext());
      webView.setBackgroundColor(Color.WHITE);
      webView.getSettings().setJavaScriptEnabled(false);
      webView.getSettings().setDefaultTextEncodingName("UTF-8");
      webView.setWebViewClient(new WebViewClient() {
        @Override
        public void onPageFinished(WebView view, String url) {
          view.postDelayed(() -> writeWebViewToPdf(call, view, outputFile, title), 500);
        }
      });
      webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    } catch (Exception ex) {
      call.reject("Unable to prepare PDF export.");
    }
  }

  private void writeWebViewToPdf(PluginCall call, WebView webView, File outputFile, String title) {
    PdfDocument document = new PdfDocument();

    try {
      int widthSpec = View.MeasureSpec.makeMeasureSpec(PAGE_WIDTH, View.MeasureSpec.EXACTLY);
      int heightSpec = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED);
      webView.measure(widthSpec, heightSpec);

      int contentHeight = Math.max(
        webView.getMeasuredHeight(),
        Math.round(webView.getContentHeight() * webView.getScale())
      );
      contentHeight = Math.max(contentHeight, PAGE_HEIGHT);
      webView.layout(0, 0, PAGE_WIDTH, contentHeight);

      int pageCount = Math.max(1, (int) Math.ceil((double) contentHeight / PAGE_HEIGHT));

      for (int pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        PdfDocument.PageInfo pageInfo = new PdfDocument.PageInfo.Builder(
          PAGE_WIDTH,
          PAGE_HEIGHT,
          pageIndex + 1
        ).create();
        PdfDocument.Page page = document.startPage(pageInfo);
        Canvas canvas = page.getCanvas();
        canvas.drawColor(Color.WHITE);
        canvas.save();
        canvas.translate(0, -pageIndex * PAGE_HEIGHT);
        webView.draw(canvas);
        canvas.restore();
        document.finishPage(page);
      }

      try (FileOutputStream output = new FileOutputStream(outputFile, false)) {
        document.writeTo(output);
      }

      shareFile(outputFile, "application/pdf", title);
      JSObject result = new JSObject();
      result.put("path", outputFile.getAbsolutePath());
      call.resolve(result);
    } catch (ActivityNotFoundException ex) {
      call.reject("No app can save or share this PDF.");
    } catch (Exception ex) {
      call.reject("Unable to export PDF.");
    } finally {
      document.close();
      webView.destroy();
    }
  }

  private void shareFile(File file, String mimeType, String title) {
    Uri uri = FileProvider.getUriForFile(
      getContext(),
      getContext().getPackageName() + ".fileprovider",
      file
    );

    Intent shareIntent = new Intent(Intent.ACTION_SEND);
    shareIntent.setType(mimeType);
    shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
    shareIntent.putExtra(Intent.EXTRA_TITLE, title);
    shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

    getActivity().startActivity(Intent.createChooser(shareIntent, title));
  }

  private String sanitizeFileName(String filename) {
    String cleaned = filename.trim().replaceAll("[^a-zA-Z0-9._-]", "_");
    return cleaned.isEmpty() ? "office-pulse-export.pdf" : cleaned;
  }
}
`,
);

writeFileSync(
  filePathsPath,
  `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="exports" path="exports/" />
</paths>
`,
);

let mainActivity = readFileSync(mainActivityPath, 'utf8');
if (!/registerPlugin\(OfficePulseExportPlugin\.class\)/.test(mainActivity)) {
  if (/super\.onCreate\(savedInstanceState\);/.test(mainActivity)) {
    mainActivity = mainActivity.replace(
      /super\.onCreate\(savedInstanceState\);/,
      'registerPlugin(OfficePulseExportPlugin.class);\n    super.onCreate(savedInstanceState);',
    );
  } else {
    mainActivity = `package ${appPackage};

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(OfficePulseExportPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
`;
  }
  writeFileSync(mainActivityPath, mainActivity);
}

let manifest = readFileSync(manifestPath, 'utf8');
if (!/android:name="androidx\.core\.content\.FileProvider"/.test(manifest)) {
  manifest = manifest.replace(
    /<\/application>/,
    `        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/office_pulse_file_paths" />
        </provider>
    </application>`,
  );
}

writeFileSync(manifestPath, manifest);

console.log('Android PDF export plugin patched for Office Pulse.');
