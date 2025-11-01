const headers = {
  apikey: 'sb_publishable_JGNwE1Bf7vxl1U-leHYolA_gkdl4zrx',
  Authorization: 'Bearer sb_secret_MTeZASAqP20EbY4KX0yvJw_wUhW7xKP',
};

const url = 'https://qpwnsvsiduvvqdijyxio.supabase.co/rest/v1/experiences?select=*';

(async () => {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log('Status:', res.status, res.statusText);
    console.log('Body:', text);
  } catch (error) {
    console.error('Request failed:', error);
    process.exit(1);
  }
})();
