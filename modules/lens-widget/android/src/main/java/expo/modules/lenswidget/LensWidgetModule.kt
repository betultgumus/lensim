package expo.modules.lenswidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LensWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LensWidget")
    AsyncFunction("update") { json: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("Uygulama bağlamı bulunamadı")
      // Persist first: receiver works even when the React Native process is absent.
      if (!context.getSharedPreferences("lens_widget", 0).edit().putString("snapshot", json).commit())
        throw IllegalStateException("Widget verileri kaydedilemedi")
      LensWidgetRenderer.updateAll(context)
    }
  }
}
