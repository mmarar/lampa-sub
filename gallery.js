(function () {
    'use strict';

    // 1. Добавляем стили для галереи (горизонтальные картинки)
    function addGalleryStyles() {
        var css = 
            '.gallery-line .gallery-item { width: 300px; display: inline-block; position: relative; margin-right: 1.2em; vertical-align: top; }' +
            '.gallery-line .gallery-item .card__view { padding-bottom: 56.25%; background: #000; border-radius: 0.5em; overflow: hidden; position: relative; }' +
            '.gallery-line .gallery-item img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }' +
            '.gallery-line .category-full__items { white-space: nowrap; overflow-x: auto; padding-top: 1em; }';
        
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
        addGalleryStyles();

        function getImages(card, container) {
            var type = (card.name && !card.title) ? 'tv' : 'movie';
            if(card.first_air_date) type = 'tv';

            // Запрашиваем картинки (Backdrops)
            var tmdb_url = type + '/' + card.id + '/images?include_image_language=ru,en,null';

            Lampa.Api.sources.tmdb.get(tmdb_url, {}, function (json) {
                if (json && json.backdrops && json.backdrops.length > 0) {
                    renderManualLine(json.backdrops, container);
                }
            }, function (error) {
                console.log('Gallery error', error);
            });
        }

        function renderManualLine(images, container) {
            var limit = 20;
            var sliced = images.slice(0, limit);
            
            // Создаем структуру HTML вручную (в стиле Lampa), чтобы работала навигация
            var lineHtml = $(
                '<div class="category-full gallery-line">' +
                    '<div class="category-full__head">' +
                        '<div class="category-full__title">Галерея</div>' +
                    '</div>' +
                    '<div class="category-full__items"></div>' +
                '</div>'
            );

            var itemsContainer = lineHtml.find('.category-full__items');

            // Подготовка списка для галереи (полный размер)
            var galleryObjects = sliced.map(function(img) {
                return { src: 'https://image.tmdb.org/t/p/original' + img.file_path };
            });

            // Генерация карточек
            sliced.forEach(function(img, index) {
                var imgUrl = 'https://image.tmdb.org/t/p/w500' + img.file_path;
                
                // Класс 'selector' обязателен, чтобы пульт мог выбрать этот элемент
                var item = $(
                    '<div class="card selector gallery-item">' +
                        '<div class="card__view">' +
                            '<img src="' + imgUrl + '" />' +
                        '</div>' +
                    '</div>'
                );

                // Обработка клика (Enter)
                item.on('hover:enter click', function() {
                    Lampa.Gallery.open(galleryObjects, index);
                });

                itemsContainer.append(item);
            });

            // Вставляем линию в интерфейс
            var target = $(container).find('.full-start-new__details');
            if (target.length === 0) target = $(container).find('.full-start__buttons');
            
            target.after(lineHtml);

            // Важный хак: просим контроллер Lampa пересчитать навигацию, чтобы он "увидел" новые кнопки
            if (Lampa.Controller.toggle) Lampa.Controller.toggle('content');
        }

        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
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