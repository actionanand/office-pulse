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

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "OfficePulseExport")
public class OfficePulseExportPlugin extends Plugin {
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
      webView.getSettings().setJavaScriptEnabled(false);
      webView.setWebViewClient(new WebViewClient() {
        @Override
        public void onPageFinished(WebView view, String url) {
          writeWebViewToPdf(call, view, outputFile, title);
        }
      });
      webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    } catch (Exception ex) {
      call.reject("Unable to export PDF.");
    }
  }

  private void writeWebViewToPdf(PluginCall call, WebView webView, File outputFile, String title) {
    try {
      PrintAttributes attributes = new PrintAttributes.Builder()
        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
        .setResolution(new PrintAttributes.Resolution("office-pulse-pdf", "Office Pulse PDF", 300, 300))
        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
        .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
        .build();

      PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(title);
      adapter.onLayout(null, attributes, null, new PrintDocumentAdapter.LayoutResultCallback() {
        @Override
        public void onLayoutFinished(android.print.PrintDocumentInfo info, boolean changed) {
          try {
            ParcelFileDescriptor descriptor = ParcelFileDescriptor.open(
              outputFile,
              ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE | ParcelFileDescriptor.MODE_READ_WRITE
            );
            adapter.onWrite(
              new PageRange[] { PageRange.ALL_PAGES },
              descriptor,
              new CancellationSignal(),
              new PrintDocumentAdapter.WriteResultCallback() {
                @Override
                public void onWriteFinished(PageRange[] pages) {
                  try {
                    descriptor.close();
                    shareFile(outputFile, "application/pdf", title);
                    JSObject result = new JSObject();
                    result.put("path", outputFile.getAbsolutePath());
                    call.resolve(result);
                    webView.destroy();
                  } catch (Exception ex) {
                    call.reject("Unable to share PDF.");
                  }
                }

                @Override
                public void onWriteFailed(CharSequence error) {
                  call.reject(error == null ? "Unable to write PDF." : error.toString());
                  webView.destroy();
                }
              }
            );
          } catch (Exception ex) {
            call.reject("Unable to write PDF.");
            webView.destroy();
          }
        }

        @Override
        public void onLayoutFailed(CharSequence error) {
          call.reject(error == null ? "Unable to layout PDF." : error.toString());
          webView.destroy();
        }
      }, new Bundle());
    } catch (Exception ex) {
      call.reject("Unable to export PDF.");
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
  mainActivity = mainActivity.replace(
    /super\.onCreate\(savedInstanceState\);/,
    'registerPlugin(OfficePulseExportPlugin.class);\n    super.onCreate(savedInstanceState);',
  );
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
