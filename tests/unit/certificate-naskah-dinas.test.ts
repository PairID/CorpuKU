import { describe, expect, it } from 'vitest';

describe('certificate naskah dinas structured layout parsing', () => {
  it('correctly splits multi-line identity strings into aligned key-value pairs', () => {
    const rawTable = 'Nama : Budi Santoso, S.STP.\nNIP/NIK : 199501012020011001\nInstansi : BPSDM Kalimantan Utara';
    const lines = rawTable.split('\n').map(l => l.trim()).filter(Boolean);
    const pairs = lines.map(line => {
      const colonIdx = line.indexOf(':');
      return {
        label: colonIdx === -1 ? line : line.slice(0, colonIdx).trim(),
        value: colonIdx === -1 ? '' : line.slice(colonIdx + 1).trim(),
      };
    });

    expect(pairs).toHaveLength(3);
    expect(pairs[0]).toEqual({ label: 'Nama', value: 'Budi Santoso, S.STP.' });
    expect(pairs[1]).toEqual({ label: 'NIP/NIK', value: '199501012020011001' });
    expect(pairs[2]).toEqual({ label: 'Instansi', value: 'BPSDM Kalimantan Utara' });
  });

  it('handles placeholders replacement for naskah dinas elements', () => {
    const template = 'Atas partisipasinya dalam {{kursus}} yang diselenggarakan oleh BPSDM Kaltara pada {{tanggal}}.';
    const replacements: Record<string, string> = {
      '{{kursus}}': 'Kepemimpinan Digital di Pemerintahan',
      '{{tanggal}}': '8 April 2026',
    };

    let result = template;
    for (const [key, val] of Object.entries(replacements)) {
      result = result.split(key).join(val);
    }

    expect(result).toBe(
      'Atas partisipasinya dalam Kepemimpinan Digital di Pemerintahan yang diselenggarakan oleh BPSDM Kaltara pada 8 April 2026.'
    );
  });
});
