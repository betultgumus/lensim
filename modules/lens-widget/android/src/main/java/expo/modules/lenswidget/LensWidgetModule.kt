package expo.modules.lenswidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS side: src/services/widgets.android.ts. Receives the precomputed widget cards and redraws placed widgets. */
class LensWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LensWidget")
    AsyncFunction("update") { json: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("Uygulama bağlamı bulunamadı")
      // Saved first, so the widget keeps working when the app process is gone.
      LensWidgetStore.save(context, json)
      LensWidgetRenderer.updateAll(context)
    }
  }
}
