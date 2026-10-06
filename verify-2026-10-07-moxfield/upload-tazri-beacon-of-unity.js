async (page) => {
  const NAME = "Tazri, Beacon of Unity (paper)", CMDR = "Tazri, Beacon of Unity", LIST = "1 Arcane Signet\n1 Base Camp\n1 Blade Historian\n1 Blasphemous Act\n1 Bloodstained Mire\n1 Brokers Hideout\n1 Burakos, Party Leader\n1 Cabaretti Courtyard\n1 Caves of Koilos\n1 Changeling Outcast\n1 Chomping Changeling\n1 Chromatic Lantern\n1 Command Tower\n1 Concealed Courtyard\n1 Coveted Prize\n1 Durnan of the Yawning Portal\n1 Eclipsed Steppe\n1 Exotic Orchard\n1 Explore the Underdark\n1 Farseek\n1 Fellwar Stone\n2 Forest\n1 Generous Gift\n1 Glasspool Mimic\n1 Grand Abolisher\n1 Hallowed Fountain\n1 Harper Recruiter\n1 Heroic Intervention\n1 Imoen, Mystic Trickster\n1 Infernal Grasp\n1 Ingenious Prodigy\n1 Ingris Stingerquill\n1 Inspiring Vantage\n2 Island\n1 Jetmir's Garden\n1 Kamiz, Obscura Oculus\n1 Karlach, Fury of Avernus\n1 Karplusan Forest\n1 Kodama's Reach\n1 Land Tax\n1 Linvala, Shield of Sea Gate\n1 Lotho, Corrupt Shirriff\n1 Mangara, the Diplomat\n1 Mardu Siegebreaker\n1 Masked Vandal\n1 Midnight Pathlighter\n1 Mirror Entity\n1 Mutable Explorer\n1 Najeela, the Blade-Blossom\n1 Nalia de'Arnise\n1 Nature's Lore\n1 Nimble Trapfinder\n1 Outlaws' Merriment\n1 Overgrown Tomb\n1 Path of Ancestry\n4 Plains\n1 Putrefy\n1 Ravenloft Adventurer\n1 Rilsa Rael, Kingpin\n1 Sacred Foundry\n1 Seasoned Dungeoneer\n1 Selfless Spirit\n1 Sodden Verdure\n1 Sol Ring\n1 Spara's Headquarters\n1 Spelunking\n1 Spirebluff Canal\n1 Spoils of Adventure\n1 Springleaf Parade\n1 Squad Commander\n1 Steam Vents\n1 Stick Together\n1 Stomping Ground\n1 Stonework Packbeast\n1 Stump Stomp\n2 Swamp\n1 Swords to Plowshares\n1 Tajuru Paragon\n1 The Destined Thief\n1 The Destined Warrior\n1 The Destined White Mage\n1 Torens, Fist of the Angels\n1 Twilight Prophet\n1 Undermountain Adventurer\n1 Unsettled Mariner\n1 Vizier of the Menagerie\n1 Weathered Wayfarer\n1 White Plume Adventurer\n1 Windswept Heath\n1 Wooded Foothills\n1 Zagras, Thief of Heartbeats\n1 Ziatora's Proving Ground\n1 Zimone, Quandrix Prodigy";
  await page.goto('https://moxfield.com/decks/personal');
  await page.getByText('New Deck', { exact: true }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('textbox', { name: 'Name' }).fill(NAME);
  const cb = dlg.getByRole('combobox', { name: 'Commander' });
  await cb.click();
  await cb.pressSequentially(CMDR, { delay: 20 });
  const opt = page.getByRole('option', { name: CMDR, exact: true }).first();
  await opt.waitFor({ timeout: 15000 });
  await opt.click({ timeout: 5000 }).catch(() => opt.evaluate(o => o.click()));
  const priv = dlg.getByRole('radio', { name: 'Private' });
  for (let i = 0; i < 4 && !(await priv.isVisible()); i++) { await dlg.locator('summary').click(); await page.waitForTimeout(800); }
  await priv.check();
  await dlg.getByRole('radio', { name: 'Paste in List' }).check();
  await dlg.locator('textarea').fill(LIST);
  await dlg.getByRole('button', { name: 'Create' }).evaluate(b => b.click());
  await page.waitForURL(u => /\/decks\/[A-Za-z0-9_-]{10,}/.test(u.toString()), { timeout: 45000 });
  await page.waitForTimeout(4000);
  const body = await page.locator('body').innerText();
  const main = body.match(/(\d+)\s+main deck/i);
  return { url: page.url(), name: NAME, main: main ? main[1] : null, noCommanderWarning: /without a Commander/i.test(body), private: /PRIVATE/.test(body) };
}
