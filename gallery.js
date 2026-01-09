(function () {
    'use strict';

    // 1. Стили для отображения и фокуса
    function addGalleryStyles() {
        var css = 
            '.gallery-line { margin: 2em 0; clear: both; }' +
            '.gallery-line .gallery-title { font-size: 1.5em; margin-bottom: 0.8em; color: #fff; opacity: 0.8; }' +
            '.gallery-line .gallery-items { white-space: nowrap; overflow-x: auto; padding: 10px 0; }' +
            '.gallery-line .gallery-item { width: 260px; display: inline-block; margin-right: 15px; border-radius: 8px; overflow: hidden; border: 2px solid transparent; transition: transform 0.2s; }' +
            '.gallery-line .gallery-item.focus { border-color: #fff; transform: scale(1.08); z-index: 10; }' +
            '.gallery-line .gallery-item img { width: 100%; display: block; background: #222; aspect-ratio: 16/9; object-fit: cover; }';
        
        var style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    function galleryPlugin() {
        addGalleryStyles();

        function getImages(card, render) {
            // Определяем тип контента
            var type = (card.first_air_date || card.name) ? 'tv' : 'movie';
            var url = type + '/' + card.id + '/images?include_image_language=ru,en,null';

            // Запрос к TMDB через встроенный метод Lampa
            Lampa.Api.sources.tmdb.get(url, {}, function (json) {
                if (json && json.backdrops && json.backdrops.length > 0) {
                    renderGallery(json.backdrops, render);
                }
            }, function () {
                // В случае ошибки просто ничего не выводим
            });
        }

        function renderGallery(backdrops, render) {
            // Ограничение до 10 штук
            var items = backdrops.slice(0, 10);
            
            var galleryHtml = $(
                '<div class="gallery-line">' +
                    '<div class="gallery-title">Кадры из фильма</div>' +
                    '<div class="gallery-items"></div>' +
                '</div>'
            );

            var list = galleryHtml.find('.gallery-items');

            // Создаем каждый кадр
            items.forEach(function (img, index) {
                var thumb = 'https://image.tmdb.org/t/p/w500' + img.file_path;
                var full = 'https://image.tmdb.org/t/p/original' + img.file_path;

                // Класс selector нужен для навигации пультом
                var item = $('<div class="gallery-item selector"><img src="' + thumb + '"></div>');

                // Обработка клика
                item.on('hover:enter', function () {
                    // Проверяем наличие галереи в системе перед открытием
                    if (window.Lampa && Lampa.Gallery && typeof Lampa.Gallery.open === 'function') {
                        var photos = items.map(function (i) {
                            return { src: 'https://image.tmdb.org/t/p/original' + i.file_path };
                        });
                        Lampa.Gallery.open(photos, index);
                    } else {
                        // Если галерея в ядре вырезана, просто показываем уведомление
                        Lampa.Noty.show('Просмотр фото не поддерживается вашей версией Lampa');
                    }
                });

                list.append(item);
            });

            // 1. Ищем текстовое описание, чтобы вставить ПОД него
            var target = $('.full-start-new__description', render);
            
            // 2. Если описания нет, вставляем под кнопки
            if (target.length === 0) target = $('.full-start__buttons', render);
            
            // 3. Если и кнопок нет, вставляем в детали
            if (target.length === 0) target = $('.full-start-new__details', render);

            target.after(galleryHtml);

            // АКТИВАЦИЯ ПУЛЬТА: заставляем Lampa пересчитать кнопки на экране
            setTimeout(function () {
                if (window.Lampa && Lampa.Controller && Lampa.Controller.toggle) {
                    Lampa.Controller.toggle('content');
                }
            }, 400);
        }

        // Слушаем событие завершения загрузки карточки
        Lampa.Listener.follow('full', function (e) {
            // Используем "complite" (с опечаткой), так как это стандарт ядра Lampa
            if (e.type === 'complite' && e.data && e.data.movie) {
                getImages(e.data.movie, e.object.activity.render());
            }
        });
    }

    // Предотвращаем повторную инициализацию
    if (!window.gallery_plugin_init) {
        window.gallery_plugin_init = true;
        galleryPlugin();
    }
})();