(() => {
  // bdvburik.github.io plugin title.js (ES5 compatible fix)
  // 2025
  //
  const storageKey = "title_cache",
    CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
  let titleCache = Lampa.Storage.get(storageKey) || {};

  async function showTitles(card) {
    const orig = card.original_title || card.original_name;
    
    // ИСПРАВЛЕНИЕ: Замена ?. на проверки существования
    const alt =
      (card.alternative_titles && card.alternative_titles.titles) || 
      (card.alternative_titles && card.alternative_titles.results) || 
      [];

    let translitObj = alt.find(
      (t) => t.type === "Transliteration" || t.type === "romaji"
    );
    
    // ИСПРАВЛЕНИЕ: Глубокая проверка вложенности вместо ?.
    let translit =
      (translitObj && translitObj.title) ||
      (translitObj && translitObj.data && translitObj.data.title) ||
      (translitObj && translitObj.data && translitObj.data.name) ||
      "";

    // ИСПРАВЛЕНИЕ: Проверка результата find перед взятием свойства
    let ruObj = alt.find((t) => t.iso_3166_1 === "RU");
    let ru = ruObj ? ruObj.title : undefined;

    let enObj = alt.find((t) => t.iso_3166_1 === "US");
    let en = enObj ? enObj.title : undefined;

    const now = Date.now();
    const cache = titleCache[card.id];
    if (cache && now - cache.timestamp < CACHE_TTL) {
      // ИСПРАВЛЕНИЕ: Замена ||= на обычное присваивание
      ru = ru || cache.ru;
      en = en || cache.en;
    }

    if (!ru || !en || !translit) {
      try {
        const type = card.first_air_date ? "tv" : "movie";
        const data = await new Promise((res, rej) =>
          Lampa.Api.sources.tmdb.get(
            `${type}/${card.id}?append_to_response=translations`,
            {},
            res,
            rej
          )
        );
        
        // ИСПРАВЛЕНИЕ: ?.
        const tr = (data.translations && data.translations.translations) || [];

        const translitData = tr.find(
          (t) => t.type === "Transliteration" || t.type === "romaji"
        );
        
        // ИСПРАВЛЕНИЕ: Глубокая проверка
        translit =
          (translitData && translitData.title) ||
          (translitData && translitData.data && translitData.data.title) ||
          (translitData && translitData.data && translitData.data.name) ||
          translit;
        
        // ИСПРАВЛЕНИЕ: Сложные выборки без ?.
        const ruData = tr.find((t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru");
        const ruVal = (ruData && ruData.data && (ruData.data.title || ruData.data.name));
        ru = ru || ruVal;

        const enData = tr.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en");
        const enVal = (enData && enData.data && (enData.data.title || enData.data.name));
        en = en || enVal;

        titleCache[card.id] = { ru, en, timestamp: now };
        Lampa.Storage.set(storageKey, titleCache);
      } catch (e) {
        console.error(e);
      }
    }

    const render = Lampa.Activity.active().activity.render();
    if (!render) return;
    $(".original_title", render).remove();

    const lang = Lampa.Storage.get("language"),
      ruHtml =
        ru && lang !== "ru"
          ? `<div style='font-size:1.3em;'>${ru}: RU</div>`
          : "",
      enHtml =
        en && lang !== "en" && en !== orig
          ? `<div style='font-size:1.3em;'>${en}: EN</div>`
          : "",
      tlHtml =
        translit && translit !== orig && translit !== en
          ? `<div style='font-size:1.3em;'>${translit}: TL</div>`
          : "";

    $(".full-start-new__title", render).after(
      `<div class="original_title" style="margin-top:-0.8em;text-align:right;">
         <div>
           <div style='font-size:1.3em;'>${orig}: Orig</div>
           ${tlHtml}${enHtml}${ruHtml}
         </div>
       </div>`
    );
  }

  if (!window.title_plugin) {
    window.title_plugin = true;
    Lampa.Listener.follow("full", (e) => {
      // ИСПРАВЛЕНИЕ: "complite" это ошибка в ядре Lampa, но мы оставляем как есть для совместимости
      if (e.type !== "complite" || !e.data.movie) return;
      
      // Доп. защита на случай отсутствия activity
      if (e.object && e.object.activity) {
          $(".original_title", e.object.activity.render()).remove();
          $(".full-start-new__title", e.object.activity.render()).after(
            '<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div></div></div>'
          );
      }
      showTitles(e.data.movie);
    });
  }
})();
