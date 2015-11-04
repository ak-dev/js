/*
 * Responsive Table 
 * Load database data into a responsive table
 *
 * <anja.kastl@gmail.com>
 */

/* globals window, document, NYI, console */

var NDTbl = NDTbl || {};

;(function(window, document, $, undefined)
{ 
        "use strict";
 
        var defaults = {
            baseurl : '',
            numCubeAds : 10,
            omniture : null,
            selectors : {
                header : '.tableFrame',
                row : 'section',
                adrow : 'section.cubeRow',
                section : 'section',
                toggleheader : '.mHeadTitle',
                toggleorder : '.toggleAsc',
                togglesearch : '#searchCol .searchOptions header',
                reset : '#searchCol div.resetBtn',
                infScroll : '#infinteScroll',
                main : '#mara',
                totop : 'a.toTop',
            },
            filters : {
                year : 'select.selectYear',
                race : 'input[type="radio"][name="event"]',
                gender : 'select.selectGender',
                division : 'select.selectDivision',
                sort : 'select.selectSort',
                order : '',
                search : '#searchCol input.search',
            },
            adrowemplate : '<section class="cubeRow" data-aditem="{{ad}}"><div class="adBanner"><div class="ad cubeAd"></div></div></section>',
            rowtemplate : '<section data-bib="{{number}}" data-race="{{race}}">'
                                +'<div class="rRank">'
                                    +'<span class="hide"> Overall Rank</span> <strong>{{overall}} </strong><span class="hide"><hr>'
                                                        +'Division Rank <strong>{{divplace}} </strong><hr>'
                                                        +'Gender Rank <strong>{{sexplace}}</strong></span>'
                                +'</div>'
                                +'<div>'
                                    +'<div class="rInfo">'
                                        +'<strong class="rName">{{first_name}} {{last_name}}</strong>'
                                        +'<p class="rNumber">#{{number}}</p>'
                                        +'<p class="rAgeGender">{{sex}}/{{age}}</p>'
                                        +'<p class="rLocation">{{town}}, {{state}}</p>'
                                    +'</div>'
                                    +'<div class="rTime">'
                                        +'<p>{{net_time}}</p>'
                                    +'</div>'
                                    +'<div class="rMore hide">'
                                        +'<a href="#" data-target="#ssOverlay" class="rShare cue">SHARE<i class="fa fa-share"></i></a>'
                                        +'<span class="boxTime">'
                                            +'<strong>TIME</strong>'
                                            +'<p class="net" data-net="{{net_time}}"><em>net:</em> {{net_time}}</p>'
                                            +'<p><em>gun:</em> {{gun_time}}</p>'
                                            +'<p><em>pace:</em> {{pace}}</p>'
                                        +'</span>'
                                        +'<span class="boxSplit">'
                                            +'<strong>SPLIT</strong>'
                                            +'<p><em>10k:</em> {{10k_split}}</p>'
                                            +'<p><em>10 mile:</em> {{10m_split}}</p>'
                                            +'<p><em>half:</em> {{half_split}}</p>'
                                            +'<p><em>20 mile:</em> {{20m_split}}</p>'
                                        +'</span>'
                                        +'<div class="chartFrame"><strong><span></span>{{first_name}} {{last_name}}</strong>'
                                            +'<div id="chart-canvas-{{number}}" style="width:95%;height:200px;display:inline-block;"></div>'
                                        +'</div>'
                                    +'</div>'
                                +'</div>'
                            +'</section>',
        };

                    

        NDTbl = function(options) 
        {
            this.options = $.extend(true, {}, defaults, options) ;
            this.options.baseurl = this.getBaseUrl();

            this._defaults = defaults;

            this.pagination = {
                loadResults : true,
                activePage : 1,
            };

            this.postdata = {};
            
            this.init();
            this.attachEvents();
        }

        NDTbl.prototype.init = function() 
        {
            this.loaddata = this.getFilterOptions();
            this.postdata = this.loaddata;

            this.initLoad();
        };

        NDTbl.prototype.attachEvents = function() 
        {
            $(window).scroll(this.infiniteScoll.bind(this));

            $(this.options.selectors.totop).on('click', this.scrollToTop.bind(this));
            $(this.options.selectors.reset).on('click', this.resetFilterOptions.bind(this));
            $(this.options.selectors.toggleheader).on('click', this.toggleOrder.bind(this));
        };

        NDTbl.prototype.initLoad = function()
        {  
            var urlparam = this.getUrlParam();

            var urlfilters = $.extend(true, {}, this.postdata, urlparam);

            var clear = this.getClearValue(false, this.postdata, urlfilters);

            if (clear)
            {
                this.loadResults(true, urlfilters);

                $(this.options.filters.sort).val(urlfilters.sort); 
                $(this.options.filters.division).val(urlfilters.division);
                $(this.options.filters.gender).val(urlfilters.gender);
                $(this.options.filters.search).val(urlfilters.search);

                if (urlfilters.division != 0)
                {
                    var display = $(this.options.filters.division+' option[value='+urlfilters.division+']').text();
                    $('div.mHeadTitle span.headDivision').text('| '+display);
                }
            }     

            ndAds.injectAd($(this.options.selectors.adrow+'[data-aditem="1"] .cubeAd'));
        }

        NDTbl.prototype.loadResults = function(clear, filteroptions)
        {   
            clear = clear || false; // true: clear list - false: append items
            filteroptions = filteroptions || false;

            var _this = this;
            var _post = this.postdata;

            var apiurl = this.getAPIOptions('api'); 
            this.postdata = (filteroptions == false) ? this.getFilterOptions() : filteroptions; 

            clear = this.getClearValue(clear, _post, this.postdata);

            this.postdata.items = (clear === false) ? this.postdata.items : [];

            $.ajax({
                url: apiurl,
                type: 'POST',
                dataType:'json',
                data: this.postdata,
                beforeSend: function() { },
                success: function(response) {
                        if (response.hasOwnProperty('items') === true)
                        {
                            _this.displayItems(response, clear);
                        }
                },
                complete: function(response) {
                        _this.pagination.loadResults = _this.setLoadResults(response); 
                }
            });
        }

        NDTbl.prototype.setLoadResults = function(response)
        {
            var loadResults = true;

            var data = $.parseJSON(response.responseText);
            var numItems = this.getActiveItems().length;

            if (parseInt(data.searchcount) <= numItems)
            {
                loadResults = false;
            }

            return loadResults;
        }

        NDTbl.prototype.getAPIOptions = function(api)
        {
            var year = '2014';
            var race = 'full';
            var url = this.options.baseurl+api+'/';

            if (typeof $(this.options.filters.year).val() != 'undefined') 
            {
                year = $(this.options.filters.year).val();
            } else if (typeof $(this.options.selectors.main).data('year') !== 'undefined') 
            {
                year = $(this.options.selectors.main).data('year');
            }

            if (typeof $(this.options.filters.race+':checked').val() != 'undefined') 
            {
                race = $(this.options.filters.race+':checked').val();
            } else if (typeof $(this.options.selectors.main).data('race') !== 'undefined') 
            {
                race = $(this.options.selectors.main).data('race');
            }

            url = url+year+'/'+race;

            return url;
        }

        NDTbl.prototype.getFilterOptions = function()
        {   
            var post = {
                items : this.getActiveItems(),
                sort: (typeof $(this.options.filters.sort).val() !== 'undefined') ? $(this.options.filters.sort).val() : 'overall', 
                order: ($(this.options.selectors.toggleorder).hasClass('asc')) ? 'asc' : 'desc', 
                division : (typeof $(this.options.filters.division).val() !== 'undefined') ? $(this.options.filters.division).val() : 0,
                gender : (typeof $(this.options.filters.gender).val() !== 'undefined') ? $(this.options.filters.gender).val() : 0,
                year : (typeof $(this.options.filters.year).val() !== 'undefined') ? $(this.options.filters.year).val() : '2014',
                race : (typeof $(this.options.filters.race+':checked').val() !== 'undefined') ? $(this.options.filters.race+':checked').val() : 'full',
                search : (typeof $(this.options.filters.search).val() !== 'undefined') ? $(this.options.filters.search).val() : '',
            };

            return post;
        }  

        NDTbl.prototype.resetFilterOptions = function()
        {
            $(this.options.filters.sort).val(this.loaddata.sort); 
            $(this.options.filters.division).val(this.loaddata.division);
            $(this.options.filters.gender).val(this.loaddata.gender);
            $(this.options.filters.year).val(this.loaddata.year);
            $(this.options.filters.race+'[value="' + this.loaddata.race + '"]').prop('checked', true);
            $(this.options.filters.search).val(this.loaddata.search);

            $('span.headYear').text(this.loaddata.year);
            $('div.mHeadTitle span.headEvent').text($(this.options.filters.race+':checked').closest('label').text());
            $('div.mHeadTitle span.headDivision').text('');
            $(this.options.selectors.toggleorder).addClass('asc').removeClass('desc');
            $(this.options.selectors.toggleorder).addClass('ndx-triangle-down').removeClass('ndx-triangle-up');

            this.loadResults(true);
            this.setUrlParam(true);
        }

        NDTbl.prototype.setUrlParam = function(reset)
        {
            reset = reset || false;

            var excluded = ['items', 'race', 'year'];
            var options = this.postdata;
            var href = window.location.href;
            var pathname = options['year']+'/'+options['race'];
            var regex = new RegExp(pathname, 'g');

            var hashvalue = '';

            if (reset && history.pushState)
            {
                history.pushState("", document.title, this.options.baseurl+this.loaddata['year']+'/'+this.loaddata['race']);
                return;
            }

            for (var prop in options)
            {
                if ($.inArray(prop, excluded) == -1 && options[prop] != 0 && options[prop] != '')
                {
                    var item = (hashvalue == '') ? prop+'='+options[prop] : '&'+prop+'='+options[prop];
                    hashvalue = hashvalue+item;
                } 
            }
            
            if (!href.match(regex))
            {
                history.pushState("", document.title, this.options.baseurl+pathname+'#'+hashvalue);
                return;
            }

            window.location.hash = hashvalue;
        }

        NDTbl.prototype.getUrlParam = function()
        {
            var fullurl = window.location.href;
            var urlelements = fullurl.split('#');
            var post = {};

            if (typeof urlelements[1] != 'undefined') 
            {
                var filters = urlelements[1].split('&');

                for (var filter in filters)
                {
                    var item = filters[filter].split('=');
                    post[item[0]] = item[1];
                }
            }
            
            return post;
        }

        NDTbl.prototype.getClearValue = function(clear, orig, curr)
        {
            for (var prop in orig)
            {
                if (prop != 'items' && (orig[prop] !== curr[prop] || curr.search != ''))
                {
                    clear = true;
                }
            }

            return clear;
        }

        NDTbl.prototype.getActiveItems = function()
        {   
            var currentitems = $(this.options.selectors.row).map(function()
            { 
                return $(this).attr("data-bib"); 
            }).get();

            return currentitems;
        }   

        NDTbl.prototype.displayItems = function(response, clear)
        {
            var _this = this;
            var items = response.items;
            var numAds = $('section.cubeRow').length;

            if (clear == true)
            {
                $(_this.options.selectors.section).remove();
            } 

            if (items.length == 0)
            {
                $(_this.options.selectors.infScroll).before('<section class="noResults"><span class="msg">no results</strong></section>'); 
            }

            $.each(items, function(index, elem)
            {
                var row = _this.options.rowtemplate;
                for (var prop in items[index])
                {
                    var replace = '{{'+prop+'}}';
                    var regex = new RegExp(replace, 'g');

                    row = row.replace(regex, items[index][prop]);    
                }

                regex = new RegExp('{{race}}', 'g'); // remove remaining placeholders
                row = row.replace(regex, response.race);

                regex = new RegExp('{{[a-zA-Z0-9_-]*}}', 'g'); // remove remaining placeholders
                row = row.replace(regex, ''); 

                $(_this.options.selectors.infScroll).before($(row));           
            });

            _this.placeAdRow(numAds, clear);

        }

        NDTbl.prototype.placeAdRow = function(activeAds, clear)
        {
            if (clear == true)
            {
                this.sendPageView('Long Island Marathon results - search');
            }

            if (activeAds < this.options.numCubeAds || clear == true)
            {
                var adregex = new RegExp('{{ad}}', 'g');
                var numads = $(this.options.selectors.adrow).length + 1;
                var cubead = this.options.adrowemplate;
                cubead = cubead.replace(adregex, numads);  

                $(this.options.selectors.infScroll).before($(cubead));
                ndAds.injectAd($(this.options.selectors.adrow+'[data-aditem="'+numads+'"] .cubeAd'));

                if (clear != true)
                {
                    this.sendPageView();
                } 
            }
        }

        NDTbl.prototype.getBaseUrl = function()
        {
            var baseurl = $(this.options.selectors.main).data('base');

            return baseurl;
        }

        NDTbl.prototype.scrollToContent = function(element)
        {
            $('html, body').animate({
                scrollTop: $(element).offset().top - 150
            }, 800);
        } 

        NDTbl.prototype.filterItems = function(items, filter, order)
        {     
            order = order || 'asc';

            var map = [];
            var modifier = 1;

            if (order == 'desc')
            {
                modifier = modifier * -1;
            }

            for (var i=0; i < items.length; i++) 
            {
                var filterdata = $(items[i]).data('item');

                map.push({
                    filter: filterdata, 
                    value: items[i] 
                });                
            }
            
            map.sort(function(a, b) { return a.filter < b.filter ? (1*modifier) : (-1*modifier); });
            
            return map;
        }

        NDTbl.prototype.sendPageView = function(newPageName)
        {
            newPageName = newPageName || '';

            if(this.options.omniture == null)
            {
                this.options.omniture = this.getOmnitureObj();
            }

            var initialPageName = this.options.omniture.pageName;

            if (newPageName !== '')
            {
                var name = initialPageName.split(/\s*-\s*/);
                name[0] = newPageName;

                initialPageName = name.join(" - ");
            }

            this.options.omniture.pageName = initialPageName;
            // this.options.omniture.pageName += "::" + newPageName;
            this.options.omniture.t();
            this.options.omniture.pageName = initialPageName;
        }

        NDTbl.prototype.getOmnitureObj = function()
        {
            var obj = null;

            if(typeof s_nd !== 'undefined')
            {
                obj = s_nd; // Newsday
            }
            else if(typeof s !== 'undefined')
            {
                obj = s; // News 12
            }

            return obj;
        }


        /*
         *  EVENTS
         */
        NDTbl.prototype.infiniteScoll = function(e)
        {
            e.preventDefault();

            if ($(this.options.selectors.infScroll).length == 0) { return; }

            var offset = $(this.options.selectors.infScroll).offset().top;
            var windowheight = $(window).height();
            
            if (this.pagination.loadResults && ($(window).scrollTop() > (offset - windowheight - 200)))
            {      
                this.pagination.loadResults = false;                 
                this.loadResults();         
            }
        }

        NDTbl.prototype.scrollToTop = function(e)
        {
            e.preventDefault();

            this.scrollToContent(this.options.selectors.header);
        } 

        // ------ TOGGLE ROW ITEM - EXPAND
        NDTbl.prototype.selectRow = function(e)
        {
            e.preventDefault();

            $('section').removeClass('expand'); // help!!!!!
            $(this).addClass('expand');
        }

        // ------ TOGGLE SEARCH POPUP - EXPAND
        NDTbl.prototype.selectSearch = function(e)
        {
            if ($(this).parent().hasClass("expand")) 
            {
                $(this).parent().removeClass('expand');
                $('.searchOptions i').removeClass('ndx-triangle-up');
                $('.searchOptions i').addClass('ndx-triangle-down');
            } else 
            {
                $(this).parent().addClass('expand');
                $('.searchOptions i').removeClass('ndx-triangle-down');
                $('.searchOptions i').addClass('ndx-triangle-up');
            }
        }

        // ------ TOGGLE ASCENDING / DESCENDING ICON
        NDTbl.prototype.toggleOrder = function(e)
        {
            e.preventDefault();

            var toggle = this.options.selectors.toggleorder;

            if ($(toggle).hasClass("ndx-triangle-down"))
            {
                $(toggle).removeClass('ndx-triangle-down');
                $(toggle).addClass('ndx-triangle-up');
                $(toggle).addClass('desc').removeClass('asc');
            } else 
            {
                $(toggle).removeClass('ndx-triangle-up');
                $(toggle).addClass('ndx-triangle-down');
                $(toggle).addClass('asc').removeClass('desc');
            }

            this.loadResults(true);
        }

        NDTbl.prototype.togglePack = function(e)
        {
            $('#chartCol').toggleClass('hide');
            
            if ($('.togglePack i').hasClass('ndx-triangle-down')) 
            {
                $('.togglePack i').removeClass('ndx-triangle-down').addClass('ndx-triangle-up');
                $('.togglePack').removeClass('closed').addClass('opened');
                
            } else 
            {
                $('.togglePack i').removeClass('ndx-triangle-up').addClass('ndx-triangle-down');
                $('.togglePack').removeClass('opened').addClass('closed');
            }
        }

        NDTbl.prototype.submitSearch = function(e)
        {
            if(e.which !== 13)
            {
                return;
            }

            this.loadResults(true);
        }

        NDTbl.prototype.changeResults = function(e)
        {
            e.preventDefault();

            this.loadResults();
        }



}(window, document, jQuery));


