export const getGameState = (oyunDurumu) => {
  if (!oyunDurumu) {
    return {
      aktif_kelime: 'BİLGİSAYAR',
      kelime_gosterim: '________',
      kalan_sure: 0,
      puan: 0,
      soru_sayaci: 0,
      mevcut_harf_sayisi: 0,
      aciklanan_harfler: [],
      ipuclari: [],
      aciklama: '',
      soru_bilgisi: '',
      kazanç: 0
    };
  }

  return {
    aktif_kelime: oyunDurumu.aktif_kelime || '',
    kelime_gosterim: oyunDurumu.kelime_gosterim || '',
    kalan_sure: Number(oyunDurumu.kalan_sure ?? 0),
    puan: Number(oyunDurumu.puan ?? 0),
    soru_sayaci: Number(oyunDurumu.soru_sayaci ?? 0),
    mevcut_harf_sayisi: Number(oyunDurumu.mevcut_harf_sayisi ?? 0),
    aciklanan_harfler: Array.isArray(oyunDurumu.aciklanan_harfler) ? oyunDurumu.aciklanan_harfler : [],
    ipuclari: Array.isArray(oyunDurumu.ipuclari) ? oyunDurumu.ipuclari : [],
    aciklama: oyunDurumu.aciklama || '',
    soru_bilgisi: oyunDurumu.soru_bilgisi || '',
    kazanç: Number(oyunDurumu.kazanç ?? 0)
  };
};

export default getGameState;
