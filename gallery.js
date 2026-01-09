(function () {
    'use strict';

    // Стили для горизонтальных картинок
    function addGalleryStyles() {
        // Убрал лишние отступы и добавил стили для фокуса
        var css = 
            '.gallery-line { margin-top: 1.5em; margin-bottom: 1em; }' + // Отступы сверху/снизу
            '.gallery-line .gallery-item { width: 220px; display: inline-block; position: relative; margin-right: 1em; border-radius: 0.5em; overflow: hidden; transition: transform 0.2s; }' +
            '.gallery-line .gallery-item.focus { transform: scale(1.1); box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 10; border: 2px solid #fff; }' + // Стиль фокуса
            '.gallery-line .card__view { padding-bottom: 56.25%; background: #222; position: relative; }' +
            '.gallery-line .gallery-item img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }' +
            '.gallery-line .category-full__items { white-space: nowrap; overflow-x: auto; padding: 1em 0; scroll-behavior: smooth; }';
        
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

            var tmdb_url = type + '/' + card.id + '/images?include_image_language=ru,en,null';

            Lampa.Api.sources.tmdb.get(tmdb_url, {}, function (json) {
                if (json && json.backdrops && json.backdrops.length > 0) {
                    renderManualLine(json.backdrops, container);
                }
            }, function (error) {
                // Ошибки игнорируем
            });
        }

        function renderManualLine(images, container) {
            // ЛИМИТ: 10 штук
            var limit = 10;
            var sliced = images.slice(0, limit);
            
            // HTML структура, совместимая с контроллером Lampa
            var lineHtml = $(
                '<div class="category-full gallery-line">' +
                    '<div class="category-full__head">' +
                        '<div class="category-full__title">Галерея</div>' +
                    '</div>' +
                    '<div class="category-full__items"></div>' +
                '</div>'
            );

            var itemsContainer = lineHtml.find('.category-full__items');

            var galleryObjects = sliced.map(function(img) {
                return { src: 'https://image.tmdb.org/t/p/original' + img.file_path };
            });

            sliced.forEach(function(img, index) {
                var imgUrl = 'https://image.tmdb.org/t/p/w500' + img.file_path;
                
                // Добавляем класс 'selector', чтобы джойстик видел элемент
                var item = $(
                    '<div class="gallery-item selector" tabindex="0">' + 
                        '<div class="card__view">' +
                            '<img src="' + imgUrl + '" />' +
                        '</div>' +
                    '</div>'
                );

                // Обработка клика / нажатия OK
                item.on('hover:enter click', function() {
                    // ЗАЩИТА: Проверяем, существует ли галерея в этой версии Lampa
                    if (Lampa.Gallery && typeof Lampa.Gallery.open === 'function') {
                        Lampa.Gallery.open(galleryObjects, index);
                    } else {
                        // Если галереи нет, выводим уведомление (если возможно) или просто ничего не делаем, чтобы не крашилось
                        Lampa.Noty.show('Галерея недоступна в вашей версии');
                    }
                });

                itemsContainer.append(item);
            });

            // ПОЗИЦИЯ: Вставляем ПОСЛЕ описания (.full-start-new__description)
            // Это опустит галерею ниже кнопок и текста
            var target = $(container).find('.full-start-new__description');
            
            // Если описания нет, ищем блок кнопок как резерв
            if (target.length === 0) target = $(container).find('.full-start__buttons');
            
            // Если и этого нет, ищем details
            if (target.length === 0) target = $(container).find('.full-start-new__details');

            target.after(lineHtml);

            // ВАЖНО ДЛЯ ДЖОЙСТИКА:
            // Даем браузеру время отрисовать картинки, затем просим Lampa обновить навигацию
            setTimeout(function() {
                if (Lampa.Controller && Lampa.Controller.toggle) {
                    Lampa.Controller.toggle('content');
                }
            }, 500);
        }

        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                if (e.data && e.data.movie && e.data.movie.id) {
                    var render = e.object.activity.render();
                    getImages(e.data.movie, render);
                
            }
        });
    }

    if (!window.plugin_gallery_loaded) {
        window.plugin_gallery_loaded = true;
        galleryPlugin();
    }
})();≈