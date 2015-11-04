/*
 * Project Map.
 *
 * @anja_kastl Anja Kastl<anja.kastl@newsday.com>
 */

var NDMap = NDMap || {};

;(function(window, document, $, undefined)
{
        "use strict";

        var defaults = { 
            baseurl : '',
            markers : 'http://assets.projects.newsday.com/maps/icons/dot_{{color}}_{{count}}.png',
            selectors : {
                main :      'article.container',
                map :       '#map',
                reset :     '.resetMap',
                popup:      '#markerOverlay',
                navnext:    '.navLink.next',
                navprev:    '.navLink.prev',
                navclose:   '.navLink.close',
            },
            filters : {
                location :  '#selectCommunityDrop',   
                range :     '.selectRange a',
                rangeFrom : '#selectDateFrom',
                rangeTo :   '#selectDateTo', 
                type :      '.selectCrime input',   
            }
        };

        var map,
            infowindow,
            geocoder,
            markers = [],
            markersDetail = [],
            zoom = 9,
            allowedBounds,
            lastValidCenter;

        var centerlat = '',
            centerlng = '';

        // var ajaxInProgress = false;
        var ajaxProgressReport = false;

        var popuptemplate;

        var nd_table;

        NDMap = function(options) 
        {
            this.options = $.extend(true, {}, defaults, options) ;
            this.options.baseurl = this.getBaseUrl();

            this._defaults = defaults;

            nd_table = new NDTable();
            
            this.init();
            this.attachEvents();
        }


        NDMap.prototype.init = function()
        {
            centerlat = (typeof $('#map').data('lat') == 'undefined') ? 41.38505 : $('#map').data('lat');
            centerlng = (typeof $('#map').data('lng') == 'undefined') ? -73.57819 : $('#map').data('lng');

            allowedBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(40.54790057546299, -74.20479337500001), 
                new google.maps.LatLng(41.14005868785519, -71.56807462500001)
            );
        }

        NDMap.prototype.attachEvents = function() 
        {
            google.maps.event.addDomListener(window, 'load', this.initMap.bind(this));
            google.maps.event.addDomListener(window, "resize", { context: this }, this.mapResize);

            // $(this.options.selectors.refresh).on('click', { context: this }, this.refreshMap);
            $(this.options.selectors.reset).on('click', { context: this }, this.resetMap);

            $(this.options.selectors.navnext).on('click', { context: this }, this.popupPrevNext);
            $(this.options.selectors.navprev).on('click', { context: this }, this.popupPrevNext);
            $(this.options.selectors.navclose).on('click', { context: this }, this.popupClose);

            // $('#results').on('click','.row a.loc', { context: this }, this.viewOnMap);

            // $('#top').on('click', 'a.toggle', { context: this }, this.moreMap);

            $(this.options.filters.location).on('change', { context: this }, this.selectLocation);

            // trigger ajax (get result data) for all the form elements
            $(this.options.filters.rangeFrom).on('change', { context: this }, this.submitForm);
            $(this.options.filters.rangeTo).on('change', { context: this }, this.submitForm);
            $(this.options.filters.range).on('click', { context: this }, this.submitForm);
            $(this.options.filters.type).on('change', { context: this }, this.submitForm);
            $(this.options.filters.location).on('change', { context: this }, this.submitForm);
        };

        NDMap.prototype.initMap = function(e) 
        {
            var clear = (window.location.hash) ? true : false;

            var mapOptions = {
                zoom: zoom,
                center: new google.maps.LatLng(centerlat, centerlng),
                minZoom: 9,
                maxZoom: 16,
                scrollwheel: false,
            };
            
            map = new google.maps.Map(document.getElementById('map'), mapOptions);

            this.getMarkers(clear);

            infowindow = new google.maps.InfoWindow({
                content: ''
            });
            
            lastValidCenter = map.getCenter();

            google.maps.event.addListener(map, 'center_changed', this.limitBoundingArea.bind(this));
            google.maps.event.addListener(map, 'zoom_changed', this.showMarkersByZoom.bind(this));

            // google.maps.event.addListenerOnce(map, 'idle', this.loadPresets);
        }

        NDMap.prototype.getMarkers = function(clear, latlng) 
        {
            // if (ajaxInProgress) { return; }

            // bounds = bounds || getBoundingBox();
            latlng = latlng || false;

            var _this = this;

            var apiurl = this.options.baseurl+'locations'; 
            var urlparam = nd_table.getFormFilters();

            nd_table.setUrlParam(urlparam, clear);

            if (ajaxProgressReport) {
                ajaxProgressReport.abort();
            }

            ajaxProgressReport = $.ajax({
                url: apiurl,
                type: 'POST',
                dataType:'json',
                data: urlparam,
                beforeSend: function() 
                { 
                    // ajaxInProgress = true;
                    _this.clearMap();
                    // $('#map').spin();
                },
                success: function(response) 
                {
                    _this.clearMap();
                    
                    if (urlparam.hasOwnProperty('location') && urlparam.location != '0')
                    {
                        _this.setMarkersDetail(response, response.communitygroups);
                    } else 
                    {
                        _this.setMarkers(response);
                    }

                    if (typeof nd_table != 'undefined' && clear)
                    {
                        nd_table.displayTableRows(response);
                    }
                },
                complete: function(response) 
                {
                    // ajaxInProgress = false;
                    // $('#map').spin(false);
                }
            });
        }

        NDMap.prototype.setMarkers = function(response) 
        {
            var _this = this;

            if (response.hasOwnProperty('communitygroups') !== true) { return; }

            var icon = {
                url: '',
                size: new google.maps.Size(50, 50), 
                origin: new google.maps.Point(0, 0), 
                anchor: new google.maps.Point(25, 25) 
            };

            var data = response.communitygroups;

            markers = [];

            $.each(data, function(key, val) 
            {
                icon.url = _this.getIcon(response, val.count, val.color);
                // var row = nd_tbl.enterDataTemplate(val.data);
                var row = key+' ('+val.count+')';

                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(val.lat,val.lng),
                    map: map,
                    title: row,
                    html: row,
                    icon: icon,
                    communitygroup: key, 
                });
                markers[key] = marker;

                google.maps.event.addListener(marker, "click", function () 
                {
                    var zoom = map.getZoom() + 2;

                    map.setZoom(zoom);
                    map.setCenter(this.position);

                    _this.setMarkersDetail(response, data, this);
                });                
            });
        }  

        NDMap.prototype.setMarkersDetail = function(response, data) 
        {
            var _this = this;

            markersDetail = [];

            var icon = {
                url: '',
                size: new google.maps.Size(50, 50), 
                origin: new google.maps.Point(0, 0), 
                anchor: new google.maps.Point(25, 25) 
            };

            $.each(data, function(index, community) // loop thry all communitygroups
            {
                $.each(community.communities, function(key, val) 
                {
                    if (typeof markersDetail[key] !== 'undefined' && val.community == markersDetail[key].community) { return true; }

                    icon.url = _this.getIcon(response, val.count, val.color);

                    var row = val.community+' ('+val.count+')';

                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(val.lat,val.lng),
                        map: map,
                        title: row,
                        html: row,
                        icon: icon,
                        community : val.community,
                    });
                    markersDetail[key] = marker;

                    google.maps.event.addListener(marker, "click", function () 
                    {
                        _this.setMarkerPopup(this, response, data);
                        _this.showPopup();

                        infowindow.setContent(this.html);
                        infowindow.open(map, this);
                    });                
                });
            });
        } 

        NDMap.prototype.showPopup = function()
        {
            console.log(window.location.hash);
            if ($(this.options.selectors.popup).is(":hidden")) 
            {
                $(this.options.selectors.popup).fadeIn();
            } else 
            {
                $(this.options.selectors.popup).fadeOut();
            }
        }

        NDMap.prototype.setMarkerPopup = function(thisMarker, response)
        {
            var _this = this;

            var community = thisMarker.community;
            var reports = response.reports.reportsgroup[community];
            var numReports = response.reports.reportsgroup[community].length;

            popuptemplate = (popuptemplate == '' || typeof popuptemplate == 'undefined') ? $(this.options.selectors.popup+' .content .item:first').clone().wrapAll("<div/>").parent().html() : popuptemplate;

            $(this.options.selectors.popup+' .numberOfElems').text(numReports);
            $(this.options.selectors.popup+' .currentSelect').text('1');
            $(this.options.selectors.popup+' .content').empty();

            $(this.options.selectors.popup+' .circle').removeClass(function(index, css) 
            {
                return (css.match (/\S+BG/g) || []).join(' ');
            });

            $.each(reports, function(index, report) 
            {
                var row = $(popuptemplate);

                var itemNum = index + 1;

                row.attr('data-color', report.color);
                row.attr('data-index', itemNum);

                if (index !== 0)
                {
                    row.css('display','none');
                } else 
                {
                    row.addClass('active');
                }
                
                row.find('.date').text(report.rpt_date);
                row.find('.time').text(report.crime_time);
                row.find('.city').text(community);
                row.find('.story').text(report.remarks);

                $(_this.options.selectors.popup+' .content').append(row);

                if (index == 0)
                {
                    $(_this.options.selectors.popup+' .circle').addClass(report.color+ 'BG');
                } 
            });
        }

        NDMap.prototype.popupPrevNext = function(e)
        {
            e.preventDefault();

            var _this = e.data.context;

            var prev = $(e.target).hasClass('prev');

            var activeIndex = $(_this.options.selectors.popup+' .item.active').data('index');
            var nextIndex = (prev) ? activeIndex - 1 : activeIndex + 1;

            if ($(_this.options.selectors.popup+' .item[data-index='+nextIndex+']').length == 0)
            {
                nextIndex = (prev) ? $(_this.options.selectors.popup+' .item').length : 1;
            }

            $(_this.options.selectors.popup+' .circle').removeClass(function(index, css) 
            {
                return (css.match (/\S+BG/g) || []).join(' ');
            });

            var color = $(_this.options.selectors.popup+' .item[data-index="'+nextIndex+'"]').data('color');
            $(_this.options.selectors.popup+' .circle').addClass(color+ 'BG');
            $(_this.options.selectors.popup+' .currentSelect').text(nextIndex);

            $(_this.options.selectors.popup+' .item.active').removeClass('active');
            $(_this.options.selectors.popup+' .item').css('display','none');

            $(_this.options.selectors.popup+' .item[data-index="'+nextIndex+'"]').addClass('active');
            $(_this.options.selectors.popup+' .item[data-index="'+nextIndex+'"]').css('display','');
        }

        NDMap.prototype.showHideMarkers = function(markers, show)
        {
            var len = markers.length;

            if (len === 0) { return; }

            for (var id in markers) 
            {
                markers[id].setVisible(show);
            }
        } 

        NDMap.prototype.getIcon = function(data, count, color) 
        {
            var color = (color.length > 1 || typeof color[0] == 'undefined') ? 'red' : color[0];

            var marker = 'marker?color='+color+'&fontSize=10&x=10&y=15&text='+count;

            if (data.hasOwnProperty('markerimg') === true && data.markerimg.hasOwnProperty(color) === true && $.inArray(parseInt(count), data.markerimg[color]) > -1)
            {
                var replace1 = '{{count}}',
                    replace2 = '{{color}}';
                var regex1 = new RegExp(replace1, 'g'),
                    regex2 = new RegExp(replace2, 'g');

                marker = this.options.markers.replace(regex1, count);    
                marker = marker.replace(regex2, color);    
            } 

            // console.log(marker);

            return marker;
        } 

        NDMap.prototype.clearMap = function()
        {
            var len = markers.length;

            if (len === 0) { return; }

            for (var id in markers) 
            {
                markers[id].setMap(null);
            }
        }

        NDMap.prototype.geolocate = function(e)
        {
            var _this = this;

            // Try HTML5 geolocation
            if(navigator.geolocation) 
            {
                navigator.geolocation.getCurrentPosition(function(position) 
                {
                    var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

                    var infowindow = new google.maps.InfoWindow({
                        map: map,
                        position: pos,
                        content: 'You are here'
                    });

                    map.setCenter(pos);
                }, function() 
                {
                    _this.handleNoGeolocation(true);
                });
            } else {
                // Browser doesn't support Geolocation
                _this.handleNoGeolocation(false);
            }
        }

        NDMap.prototype.handleNoGeolocation = function(errorFlag) 
        {
            var content = (errorFlag) ? 'Error: The Geolocation service failed.' : 'Error: Your browser doesn\'t support geolocation.';

            var options = {
                map: map,
                position: new google.maps.LatLng(centerlat, centerlng),
                content: content
            };

            var infowindow = new google.maps.InfoWindow(options);

            map.setCenter(options.position);
        }

        NDMap.prototype.loadPresets = function()
        {
            lastValidCenter = map.getCenter();
        }

        NDMap.prototype.limitBoundingArea = function()
        {
            if (allowedBounds.contains(map.getCenter())) 
            {
                lastValidCenter = map.getCenter();
                return; 
            }

            map.panTo(lastValidCenter);
        }

        NDMap.prototype.getBoundingBox = function()
        {
            var bounds = map.getBounds();

            if (typeof bounds == "undefined") { return true; }
            
            var boundingbox = [
                [ bounds.getNorthEast().lat(), bounds.getNorthEast().lng() ],  // ne
                [ bounds.getNorthEast().lat(), bounds.getSouthWest().lng() ],  // nw
                [ bounds.getSouthWest().lat(), bounds.getSouthWest().lng() ],  // sw
                [ bounds.getSouthWest().lat(), bounds.getNorthEast().lng() ],  // se
            ]

            return boundingbox;
        }

        NDMap.prototype.showMarkersByZoom = function()
        {
            var zoom = map.getZoom();

            if (zoom > 10)
            {
                this.showHideMarkers(markers, false);

                if (markersDetail.length > 0)
                {
                    this.showHideMarkers(markersDetail, true);
                }
            } else
            {
                if (markers.length > 0)
                {
                    this.showHideMarkers(markers, true);
                }
                this.showHideMarkers(markersDetail, false);
            }
        }

        NDMap.prototype.moreMap = function(e)
        {
            e.preventDefault();

            var _this = e.data.context;

            var topDivHeight = $(_this.options.selectors.map).offset().top,
                newMapHeight = mapHeight;

            if (!$(this).hasClass('active'))
            {
                newMapHeight = $(window).height() - topDivHeight;
                $(this).addClass('active');
                $(this).text('Less Map');
            } else
            {
                $(this).removeClass('active');
                $(this).text('More Map');
            }

            $(_this.options.selectors.map).animate({ height: newMapHeight }, {duration: 200, easing: 'linear'});
            setTimeout(function(){
                google.maps.event.trigger(map, 'resize'); 
            }, 800);
        }

        NDMap.prototype.mapResize = function()
        {
            var _this = e.data.context;

            if ($('#top a.toggle').hasClass('active'))
            {
                var topDivHeight = $(_this.options.selectors.map).offset().top,
                    newMapHeight = $(window).height() - topDivHeight;

                $(_this.options.selectors.map).animate({ height: newMapHeight }, {duration: 100, easing: 'linear'});
                setTimeout(function(){
                    google.maps.event.trigger(map, 'resize'); 
                }, 500);
            }
        }

        NDMap.prototype.submitForm = function(e)
        {
            e.preventDefault();

            var _this = e.data.context;

            _this.getMarkers(true);
        }

        NDMap.prototype.resetMap = function(e)
        {
            e.preventDefault();

            var _this = e.data.context;

            _this.clearMap();

            map.setCenter(new google.maps.LatLng(centerlat, centerlng));
            map.setZoom(zoom);
        }

        NDMap.prototype.viewOnMap = function(e)
        {
            e.preventDefault();

            var lat = $(this).data('lat'),
                lng = $(this).data('lng');

            var loc = new google.maps.LatLng(lat, lng);

            map.setZoom(13);
            map.setCenter(loc);
        }

        NDMap.prototype.selectLocation = function(e)
        {
            e.preventDefault();

            var _this = e.data.context;

            var thiszoom = 13;

            var lat = $(this).find(':selected').data('lat'),
                lng = $(this).find(':selected').data('lng');

            var loc = new google.maps.LatLng(lat, lng);

            var community = $(this).val();

            if (community == '0')
            {
                thiszoom = zoom;
            }

            map.setZoom(thiszoom);
            map.setCenter(loc);
        }

        NDMap.prototype.getBaseUrl = function()
        {
            var baseurl = (typeof $(this.options.selectors.main).data('base') != 'undefined') ? $(this.options.selectors.main).data('base') : 'http://'+window.location.host+'/';

            return baseurl;
        }

}(window, document, jQuery));

nd_map = new NDMap();