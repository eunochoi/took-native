package took.backup.sharing

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class TookBackupSharingModule : Module() {
  private var pending: Promise? = null
  override fun definition() = ModuleDefinition {
    Name("TookBackupSharing")
    AsyncFunction("shareAsync") { urls: List<String>, promise: Promise ->
      check(pending == null) { "A backup share is already open" }
      require(urls.size in 2..20000) { "Select a complete backup set" }
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val uris = ArrayList<Uri>()
      for (url in urls) {
        val uri = Uri.parse(url)
        require(uri.scheme == "file") { "Only local backup files can be shared" }
        val file = File(requireNotNull(uri.path)).canonicalFile
        require(file.path.startsWith(context.cacheDir.canonicalPath + File.separator) &&
          file.name.matches(Regex("took-backup-[a-zA-Z0-9-]+\\.zip")) && file.isFile) {
          "Only Took cache backups can be shared"
        }
        uris.add(FileProvider.getUriForFile(context, context.packageName + ".SharingFileProvider", file))
      }
      val intent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
        type = "application/zip"
        putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        clipData = ClipData.newUri(context.contentResolver, "Took backup", uris.first()).apply {
          for (uri in uris.drop(1)) addItem(ClipData.Item(uri))
        }
      }
      pending = promise
      try {
        appContext.throwingActivity.startActivityForResult(Intent.createChooser(intent, "전체 Took 백업 공유"), 7412)
      } catch (error: Exception) { pending = null; throw error }
    }
    OnActivityResult { _, (requestCode) ->
      if (requestCode == 7412) { pending?.resolve(null); pending = null }
    }
  }
}
