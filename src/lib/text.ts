/** 검색용: 대소문자, 띄어쓰기, 구두점 차이를 지운다. */
export const normalize = (s: string): string => s.normalize('NFC').toLowerCase().replace(/[\s\-_/·.,()]+/g, '');
