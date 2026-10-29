package bloo.storage

import android.net.Uri
import android.provider.DocumentsContract
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.security.MessageDigest
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class BlooLocalModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)
  private val resolver get() = context.contentResolver
  private val pattern = Regex("^bloolog-[a-f0-9]{16}-[0-9-]{10}-[0-9]+-[a-f0-9]{16}\\.bloo$")
  private fun folder(value: String): Uri {
    val uri = Uri.parse(value)
    require(uri.scheme == "content" && uri.authority == "com.android.externalstorage.documents") { "BLOO_LOCAL_FOLDER" }
    val id = if (DocumentsContract.isDocumentUri(context, uri)) DocumentsContract.getDocumentId(uri) else DocumentsContract.getTreeDocumentId(uri)
    return DocumentsContract.buildDocumentUriUsingTree(uri, id)
  }
  private fun children(directory: Uri): List<Pair<String, Uri>> {
    val result = mutableListOf<Pair<String, Uri>>()
    val uri = DocumentsContract.buildChildDocumentsUriUsingTree(directory, DocumentsContract.getDocumentId(directory))
    resolver.query(uri, arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_DOCUMENT_ID), null, null, null).use { cursor ->
      checkNotNull(cursor) { "BLOO_FOLDER_UNAVAILABLE" }
      while (cursor.moveToNext()) result.add(cursor.getString(0) to DocumentsContract.buildDocumentUriUsingTree(directory, cursor.getString(1)))
    }
    return result
  }
  public override fun definition() = ModuleDefinition {
    Name("BlooLocal")
    AsyncFunction("deriveKey") { password: String, saltHex: String ->
      require(Regex("^[a-f0-9]{32}$").matches(saltHex) && password.toByteArray(Charsets.UTF_8).size <= 1024) { "BLOO_INVALID" }
      val salt = saltHex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
      val characters = password.toCharArray()
      val spec = PBEKeySpec(characters, salt, 600_000, 256)
      characters.fill('\u0000')
      try {
        val key = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        try { key.joinToString("") { (it.toInt() and 255).toString(16).padStart(2, '0') } }
        finally { key.fill(0) }
      } finally { spec.clearPassword() }
    }
    AsyncFunction("folder") { value: String ->
      val parent = folder(value)
      var name = ""
      resolver.query(parent, arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null).use { cursor ->
        if (cursor != null && cursor.moveToFirst()) name = cursor.getString(0)
      }
      if (name.equals("bloolog", true)) parent.toString()
      else (children(parent).firstOrNull { it.first == "bloolog" }?.second
        ?: checkNotNull(DocumentsContract.createDocument(resolver, parent, DocumentsContract.Document.MIME_TYPE_DIR, "bloolog"))).toString()
    }
    AsyncFunction("names") { value: String -> children(folder(value)).map { it.first } }
    AsyncFunction("publish") { source: String, value: String, name: String ->
      require(pattern.matches(name)) { "BLOO_INVALID" }
      val uri = Uri.parse(source)
      require(uri.scheme == "file") { "BLOO_INVALID" }
      val file = File(checkNotNull(uri.path)).canonicalFile
      require(file.path.startsWith(context.cacheDir.canonicalPath + File.separator) && file.extension == "bloo") { "BLOO_INVALID" }
      val directory = folder(value)
      val pending = checkNotNull(DocumentsContract.createDocument(resolver, directory, "application/octet-stream", "$name.pending"))
      var completed = false
      try {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
          checkNotNull(resolver.openOutputStream(pending, "w")).use { output ->
            val buffer = ByteArray(256 * 1024)
            while (true) {
              val count = input.read(buffer)
              if (count < 0) break
              digest.update(buffer, 0, count)
              output.write(buffer, 0, count)
            }
            output.flush()
          }
        }
        val verification = MessageDigest.getInstance("SHA-256")
        checkNotNull(resolver.openInputStream(pending)).use { input ->
          val buffer = ByteArray(256 * 1024)
          while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            verification.update(buffer, 0, count)
          }
        }
        check(MessageDigest.isEqual(digest.digest(), verification.digest())) { "BLOO_INVALID" }
        checkNotNull(DocumentsContract.renameDocument(resolver, pending, name))
        completed = true
      } finally {
        if (!completed) runCatching { DocumentsContract.deleteDocument(resolver, pending) }
      }
    }
    AsyncFunction("remove") { value: String, name: String ->
      require(pattern.matches(name) || (name.endsWith(".pending") && pattern.matches(name.removeSuffix(".pending")))) { "BLOO_INVALID" }
      children(folder(value)).firstOrNull { it.first == name }?.let {
        check(DocumentsContract.deleteDocument(resolver, it.second)) { "BLOO_FOLDER_UNAVAILABLE" }
      }
    }
  }
}
