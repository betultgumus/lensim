import sections from './privacy.content.json';
import kvkk from './kvkk.content.json';
import release from '../../release.config.json';
import { fillSections } from './legal';
export const privacySections = fillSections(sections, release);
export const kvkkSections = fillSections(kvkk, release);
