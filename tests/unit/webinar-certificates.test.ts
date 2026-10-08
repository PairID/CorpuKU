import { describe, expect, it } from 'vitest';
import {
  formatWebinarCertificateNumber,
  formatWebinarCertificateFilename,
  ROMAN_MONTHS,
} from '../../src/lib/webinar-certificates';

describe('webinar certificate numbering and filename formatting', () => {
  it('formats certificate number according to the BPSDM Kaltara standard', () => {
    const certNum = formatWebinarCertificateNumber({
      sequenceNumber: 12327,
      seriesCode: 'AKJ-26',
      date: new Date('2026-07-15T08:00:00Z'),
    });

    // Format: [Kode Klasifikasi]_[Nomor Urut]_[Instansi]_[Kode Event/Seri]_[Bulan Romawi]_[Tahun]
    expect(certNum).toBe('800.2.5_12327_BPSDM_AKJ-26_VII_2026');
  });

  it('pads sequence numbers with leading zeros up to 5 digits if below 10000', () => {
    const certNum = formatWebinarCertificateNumber({
      sequenceNumber: 1,
      seriesCode: 'AKJ-26',
      date: new Date('2026-10-07T08:00:00Z'),
    });

    expect(certNum).toBe('800.2.5_00001_BPSDM_AKJ-26_X_2026');
  });

  it('supports custom classification code and institution if specified', () => {
    const certNum = formatWebinarCertificateNumber({
      sequenceNumber: 42,
      seriesCode: 'WEB-01',
      date: new Date('2026-01-10T08:00:00Z'),
      classificationCode: '893.3',
      institution: 'BPSDM_KALTARA',
    });

    expect(certNum).toBe('893.3_00042_BPSDM_KALTARA_WEB-01_I_2026');
  });

  it('correctly maps all 12 Roman month numerals', () => {
    expect(ROMAN_MONTHS).toHaveLength(12);
    expect(ROMAN_MONTHS[0]).toBe('I');
    expect(ROMAN_MONTHS[6]).toBe('VII');
    expect(ROMAN_MONTHS[9]).toBe('X');
    expect(ROMAN_MONTHS[11]).toBe('XII');
  });

  it('formats downloaded PDF filename according to standard convention', () => {
    const filename = formatWebinarCertificateFilename({
      participantName: 'A.S. Fitriannur Azim, S.Sos.',
      certificateNumber: '800.2.5_12327_BPSDM_AKJ-26_VII_2026',
      category: 'Yang Lain',
    });

    expect(filename).toBe(
      'A.S. Fitriannur Azim, S.Sos.-800.2.5_12327_BPSDM_AKJ-26_VII_2026-Yang Lain.pdf'
    );
  });

  it('sanitizes illegal path and file characters in generated filename', () => {
    const filename = formatWebinarCertificateFilename({
      participantName: 'Dr. John / Doe * <Special>',
      certificateNumber: '800.2.5_12327_BPSDM_AKJ-26_VII_2026',
    });

    expect(filename).not.toMatch(/[/\\?%*:|"<>]/);
    expect(filename.endsWith('-Yang Lain.pdf')).toBe(true);
  });
});
