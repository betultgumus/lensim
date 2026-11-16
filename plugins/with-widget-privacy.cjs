const { withXcodeProject, IOSConfig } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
const plist = require('@expo/plist');
module.exports = config => withXcodeProject(config, config => {
  const project = config.modResults;
  const name = 'ExpoWidgetsTarget';
  const target = Object.entries(project.pbxNativeTargetSection()).find(([key, value]) => !key.endsWith('_comment') && String(value.name).replaceAll('"', '') === name);
  if (!target) throw new Error('Widget extension hedefi bulunamadı; Xcode mod sıralamasını kontrol edin.');
  const [uuid, nativeTarget] = target;
  const directory = path.join(config.modRequest.platformProjectRoot, name);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'PrivacyInfo.xcprivacy'), plist.default.build({
    NSPrivacyTracking: false,
    NSPrivacyCollectedDataTypes: [],
    NSPrivacyAccessedAPITypes: [{
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
      NSPrivacyAccessedAPITypeReasons: ['1C8F.1'],
    }],
  }));
  const phases = project.hash.project.objects.PBXResourcesBuildPhase ?? {};
  if (!nativeTarget.buildPhases.some(phase => phases[phase.value])) project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', uuid);
  IOSConfig.XcodeUtils.addResourceFileToGroup({ filepath: 'PrivacyInfo.xcprivacy', isBuildFile: true, groupName: name, project, targetUuid: uuid });
  return config;
});
