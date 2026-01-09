(function () {
    'use strict';

    // 1. Внедряем CSS стили для правильного отображения горизонтальных картинок (16:9)
    // Без этого Lampa сплющит их как постеры.
    function addGalleryStyles() {
        var css = 
            '.gallery-line .card__img { padding-bottom: 56.25% !important; background-color: #000; }' + // Делаем контейнер 16:9
            '.gallery-line .card__view { padding-bottom: 56.25% !important; }' +
            '.gallery-line .card__title { display: none; }'; // Скрываем пустой заголовок
        
        var style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet){
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        document.getElementsByTagName('head')[0].appendChild(style);
    }

    function galleryPlugin() {
        // Запускаем стили
        addGalleryStyles();

        function getImages(card, container) {
            // Определяем тип (фильм или сериал)
            var type = (card.name && !card.title) ? 'tv' : 'movie';
            // Если есть дата выхода сериала, уточняем
            if(card.first_air_date) type = 'tv';

            var tmdb_url = type + '/' + card.id + '/images?include_image_language=ru,en,null';

            // Используем встроенный метод запроса Lampa
            Lampa.Api.sources.tmdb.get(tmdb_url, {}, function (json) {
                if (json && json.backdrops && json.backdrops.length > 0) {
                    renderLine(json.backdrops, container);
                }
            }, function (error) {
                // Ошибки тихо игнорируем, чтобы не спамить в консоль ТВ
            });
        }

        function renderLine(images, container) {
            // Берем первые 20 картинок, чтобы не забить память ТВ
            var limitedImages = images.slice(0, 20);

            // Преобразуем для Lampa
            var results = limitedImages.map(function (img) {
                return {
                    // w500 - оптимально для ленты на ТВ (не мыло, но и не 4k)
                    img: 'https://image.tmdb.org/t/p/w500' + img.file_path,
                    // original - для открытия на весь экран
                    original: 'https://image.tmdb.org/t/p/original' + img.file_path,
                    title: '', // Названия нет
                    url: '',   // Ссылки перехода нет, мы перехватим клик
                    ready: true // Говорим Lampa, что данные готовы
                };
            });

            // Создаем линию
            var line = new Lampa.Line({
                title: 'Галерея',
                results: results,
                card_events: {
                    onEnter: function (item, element) {
                        // При клике открываем встроенную смотрелку фото
                        var galleryItems = results.map(function(i){
                            return { src: i.original };
                        });
                        
                        // Ищем индекс нажатой картинки
                        var index = results.indexOf(item);
                        if (index < 0) index = 0;

                        Lampa.Gallery.open(galleryItems, index);
                    }
                }
            });

            var renderedLine = line.render();
            
            // Добавляем класс, к которому мы привязали CSS выше
            renderedLine.addClass('gallery-line');

            // Вставляем ПОСЛЕ блока с кнопками и описанием
            // Обычно это класс .full-start-new__details или .full-start__buttons
            var target = $(container).find('.full-start-new__details');
            if (target.length === 0) target = $(container).find('.full-start__buttons');
            
            target.after(renderedLine);
            
            // Запускаем ленивую загрузку картинок
            line.start();
        }

        // Слушаем открытие карточки
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                // Проверяем, что это фильм/сериал, а не что-то другое
                if (e.data && e.data.movie && e.data.movie.id) {
                    var render = e.object.activity.render();
                    getImages(e.data.movie, render);
                }
            }
        });
    }

    if (!window.plugin_gallery_loaded) {
        window.plugin_gallery_loaded = true;
        galleryPlugin();
    }
})();
