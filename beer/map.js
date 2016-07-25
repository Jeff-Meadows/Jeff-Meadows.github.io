L.mapbox.accessToken = 'pk.eyJ1IjoianJtZWFkb3dzMiIsImEiOiIwNzVjMzAwZDM2MDhhMDE1NDYwYjU1ZDU2Nzk5YWU0MyJ9.VmI8CFdeetVaM3FbNSO00Q';

var map = L.mapbox.map('map', 'mapbox.dark');
map.legendControl.addLegend(document.getElementById('legend').innerHTML);

var breweryTemplate = '<div>' +
    '<h3 class="layer-title">{{name}}</h3>' +
    '<table><tr><td>' +
    '<div class="layer-description">' +
    '<p>Famous for:</p><ul>' +
    '{{#beers}}' +
    '<li><a href="{{link}}" target="_blank">{{name}} (#{{rank}}))</a></li>' +
    '{{/beers}}</ul>' +
    '<a href="{{website}}" target="_blank">Brewery Website</a><br />' +
    '<a href="{{link}}" target="_blank">Beer Advocate Brewery Page</a>' +
    '</div>' +
    '<hr />' +
    '<div class="layer-address">{{address}}</div>' +
    '<div class="layer-directions">' +
    '<a href="https://www.google.com/maps?saddr&daddr={{address}}" target="_blank">Get Directions</a>' +
    '</div>' +
    '</td>' +
    '{{#image}}<td><span class="layer-image"><img src="{{image}}" height=100 width=100 /></span></td>{{/image}}' +
    '</tr></table>' +
    '</div>';
var beerTemplate = '<div class="beer-panel leaflet-container" data-brewery="{{brewery}}" data-style="{{style}}" data-id="{{id}}">' +
    '<h3 class="layer-title">{{rank}}. {{name}}</h3>' +
    '<div class="layer-description">' +
    '<strong>{{styleObject.name}}</strong><br />' +
    '{{breweryObject.name}}<br />' +
    '</div><div class="layer-address">{{breweryObject.address}}</div><div class="layer-description">' +
    '<a href="{{link}}" target="_blank">Beer Advocate Beer Page</a>' +
    '</div>' +
    '</div>';
var markers = {};

var beers, styles, breweries;
$.when(
    $.getJSON('beers.json', function(data) { beers = data.beers; }),
    $.getJSON('beer_styles.json', function(data) { styles = data.beer_styles; }),
    $.getJSON('breweries.geojson', function(data) { breweries = data; })
).then(function() {
        var breweryLayer = L.mapbox.featureLayer(breweries, {
            pointToLayer: L.mapbox.marker.style
        }).addTo(map);
            function makeMarker(layer) {
                layer.feature.properties.image = layer.feature.properties.link.replace('www', 'cdn').replace('beer/profile', 'im/places').replace(/\/$/, '') + '.jpg';
                layer.feature.properties.beers = layer.feature.properties.beers.map(function(beer) {
                    beer = beer - 1;
                    return {
                        rank: beer,
                        name: beers[beer].name,
                        link: beers[beer].link,
                        style: styles[beers[beer].style]
                    };
                });
                layer.bindPopup(L.mapbox.template(breweryTemplate, layer.feature.properties));
                markers[layer.feature.properties.id] = layer;
            }
            breweryLayer.eachLayer(makeMarker);
            beers.forEach(function(beer) {
                beer.breweryObject = markers[beer.brewery].feature.properties;
                beer.styleObject = styles[beer.style - 1];
                var beerDiv = $(L.mapbox.template(beerTemplate, beer));
                $('#beer-panels-hidden').append(beerDiv);
            });
            styles.forEach(function(style) {
                $('#beer-styles').append('<option value="' + style.id + '">' + style.name + '</option>');
            });
            $('#top-beers').on('change', filterBeers);
            $('#beer-window').on('click', filterBeers);
            $('#beer-styles').on('change', filterBeers);
            map.on('move', filterBeers);
            function filterBeers() {
                var beer_divs = $('#beer-panels-hidden div.beer-panel').clone();
                var top = $('#top-beers').val();
                var window = $('#beer-window').prop('checked');
                var style = $('#beer-styles').val();
                var bounds = map.getBounds();
                beer_divs = beer_divs.slice(0, top);
                beer_divs = beer_divs.filter(function(i, beer) {
                    return style === '0' || $(beer).data('style') == style;
                });
                beer_divs = beer_divs.filter(function(i, beer) {
                    return !window || bounds.contains(markers[$(beer).data('brewery')].getLatLng());
                });
                Object.keys(markers).forEach(function(marker) {
                    marker = markers[marker];
                    var show = beer_divs.toArray().some(function(beer) {
                        return $(beer).data('brewery') === marker.feature.properties.id;
                    });
                    marker.setOpacity(show ? 1: 0);
                });
                $('#beer-panels').quicksand(beer_divs, function() {
                    $('#beer-panels').css({'height': ''});
                });
                $('#num-beers').html(beer_divs.length);
                $('#beer-panels div.beer-panel').hover(
                    function() {
                        var $this = $(this), brewery = $this.data('brewery');
                        markers[brewery].bounce();
                    }, function() {
                        var $this = $(this), brewery = $this.data('brewery');
                        markers[brewery].stopBouncing();
                    })
                    .click(function() {
                        var $this = $(this), brewery = $this.data('brewery');
                        map.setView(markers[brewery].getLatLng(), 8);
                        markers[brewery].openPopup();
                    });
            }
            map.fitBounds(breweryLayer.getBounds());
            filterBeers();
});
