// 상세 교재로 다시 쓴 워크북 목록. scripts/check-workbooks.ts가 이 목록 전체를 검사한다.
import type { Kind, Row } from '../fieldwork.ts';
import type { Guide } from './types.ts';
import * as wpaPmf from './wpa-pmf.ts';
import * as ssidMap from './ssid-map.ts';
import * as channel from './channel.ts';
import * as bleAd from './ble-ad.ts';
import * as blePair from './ble-pair.ts';
import * as interference from './interference.ts';
import * as ir from './ir.ts';
import * as subghz from './subghz.ts';
import * as gps from './gps.ts';
import * as firmware from './firmware.ts';

export interface FieldEntry { type: 'field'; kind: Kind; guide: Guide; golden: Row[] }
export const FIELD_WORKBOOKS: FieldEntry[] = [
  { type: 'field', kind: 'ssid-map', guide: ssidMap.guide, golden: ssidMap.golden },
  { type: 'field', kind: 'wpa-pmf', guide: wpaPmf.guide, golden: wpaPmf.golden },
  { type: 'field', kind: 'channel', guide: channel.guide, golden: channel.golden },
  { type: 'field', kind: 'ble-ad', guide: bleAd.guide, golden: bleAd.golden },
  { type: 'field', kind: 'ble-pair', guide: blePair.guide, golden: blePair.golden },
  { type: 'field', kind: 'interference', guide: interference.guide, golden: interference.golden },
  { type: 'field', kind: 'ir', guide: ir.guide, golden: ir.golden },
  { type: 'field', kind: 'subghz', guide: subghz.guide, golden: subghz.golden },
  { type: 'field', kind: 'gps', guide: gps.guide, golden: gps.golden },
  { type: 'field', kind: 'firmware', guide: firmware.guide, golden: firmware.golden },
];
