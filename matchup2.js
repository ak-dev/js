/*
 * Matchup
 * That's so Long Island
 *
 * @anja_kastl Anja Kastl<anja.kastl@newsday.com>
 */


var NDMatchup = NDMatchup || {};

;(function(window, document, $, undefined)
{
        "use strict";

        var defaults = { 
            baseurl:                '', 
            selectors : {
                main :              'article.container',
                wrapper:            '#mWrap',   // carousel
                itemwrapper:        '#mat',     // carousel
                matchup:            'div.mu', 
                poll:               'section',      // poll element 
                resultbtn:          '.btn.resultsB',                  // results
                nav:                'aside nav a',   // navigation elemnt (required for categories)
                share:              '.shareVote',
                socialtext:         'span.matchupshare',
                socialtextall:      'span.projectshare',
            },
            placeholders : [ '{PROJECT}', '{MATCHUP}', '{VOTE}', '{URL}', '{HANDLE}' ],
        };

        var project, // valid project id required - can be set manually in SETTINGS.PROJECT
            projectround;

        var votecount = [];

        var scrollListeners = {};

        var settings = // override default settings
        {
            //categories:     '', // manually set categories array to override navigation parsing or set to false - if not set AND there is no nav on the page then CATEGORIES defaults to false
            barcolors:      ['#c80000', '#fc6000', '#fcd500', '#3bd200'],  // JustGage meter colors
            //cookies:        true,  // cookies to store votes is enabled - default is true
            //project:        'thats-so-long-island', // override project id that's scraped from page - $(CSS_SELECTORS.WRAPPER).attr('data-prefix') and $('.poster').attr('data-prefix');
            //projectround:   'matchup-round', 
        };

        var sharehtml = '<span class="simpleShare scode">'
                            +'<a height="450" width="600" href=“#” class="fb fa fa-facebook"></a>'
                            +'<a height="440" width="550" href=“#” class="tw fa fa-twitter"></a>'
                            +'<a height="400" width="550" href=“#” class="gp fa-google-plus"></a>'
                            +'<a height="360" width="800" href=“#” class="pin fa-pinterest"></a>'
                        +'</span>';


        NDMatchup = function(options) 
        {
            this.options = $.extend(true, {}, defaults, options);

            this._defaults = defaults;

            this.init();
            this.attachEvents();
        }


        NDMatchup.prototype.init = function()
        {
            var _this = this;

            if (window.location.hash)
            {
                this.slimHeader();
            }

            $(".lazy:not(.done)").each(function(){
                _this.lazyLoad($(this));
            })

            var time = this.setTimer();
            this.initCountdown(time);

            this.options.baseurl = $(this.options.selectors.main).data('base');

            project = this.getProject();
            projectround = this.getRound();

            votecount = this.getPolls();

            this.simplePoll_displayResults(null, true);

            this.setProjectShareData();

            this.loadHash();
        }

        NDMatchup.prototype.attachEvents = function() 
        {
            // waypoints slim header
            $(window).scroll(this.slimHeader);
            // Selection triggers on vote
            $(this.options.selectors.itemwrapper+" "+this.options.selectors.poll+ ' .imgBox').on("click", { context: this }, this.triggerVote);
            // Selection triggers results view
            $(this.options.selectors.resultbtn).on("click", { context: this }, this.seeLiveResults); 
            // Show more/less of the description
            $('.morePbtn').on("click", { context: this }, this.showHideDescription);  

            this.lazyLoadBind($(".lazy:not(.done)"));

            this.bindPageView($('.advert:not(.tracked)'));

        }

        NDMatchup.prototype.isInView = function(el)
        {
            if (typeof el == "undefined") { return false; }

            if (typeof el === "object") 
            {
                el = el[0];
            }

            var rect = el.getBoundingClientRect();

            return rect.bottom > 0 &&
                    rect.right > 0 &&
                    rect.left < (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */ &&
                    rect.top < (window.innerHeight || document.documentElement.clientHeight) /*or $(window).height() */;
        }

        NDMatchup.prototype.lazyLoad = function(ele)
        {
            if(this.isInView(ele) && !ele.hasClass("done"))
            {
                ele.attr("src", ele.data("src")).load(function()
                {
                    ele.addClass("done");
                    $(window).off("scroll", scrollListeners[ele.index()]);
                });
            }
        }

        NDMatchup.prototype.lazyLoadBind = function(ele)
        {
            var _this = this;

            ele.each(function()
            {
                var t = $(this);
                scrollListeners[ele.index()] = $(window).scroll(function()
                {
                    _this.lazyLoad(t);
                });
            })
        }

        NDMatchup.prototype.bindPageView = function(ele)
        {
            var _this = this;

            ele.each(function()
            {
                var t = $(this);
                scrollListeners[ele.index()] = $(window).scroll(function()
                {
                    if(_this.isInView(ele) && !ele.hasClass("done"))
                    {
                        ele.attr("src", ele.data("src")).load(function()
                        {
                            o.trackPageView();
                            ele.addClass("tracked");
                            $(window).off("scroll", scrollListeners[ele.index()]);
                        });
                    }
                });
            })
        }

        /*
         * adjust header graphic to slim header and back
         */
        NDMatchup.prototype.slimHeader = function() 
        {
            if ($('div#page header').length === 0) { return; }

            var top = $(window).scrollTop();

            // var header = $("div.fullBanner:eq(0)").height() + $("#topToolbar").height() + $('#main header').height();
            var header = $("div.fullBanner:eq(0)").height() + $("#topToolbar").height() + $("#masthead").height() + $('#main header').height() - 75;

            if (document.body.clientWidth <= 728) 
            {
                header = header - 100;
            }

            if (top >= header) 
            {
                $('#main header').addClass("fixed");
                $('#main').addClass("fixed");
            } else {
                $('#main header').removeClass("fixed");
                $('#main').removeClass("fixed");
            }
        }


        /*
         * toggle results
         * show results for each poll on click
         * hide results on second click
         */
        NDMatchup.prototype.seeLiveResults = function(e)
        {
            e.preventDefault();

            var _this = e.data.context;

            if (!$('main#main').hasClass('liveResults'))
            {
                $('main#main').addClass('liveResults');
                $(_this.options.selectors.resultbtn+ ' span').text('TURN OFF RESULTS');

                _this.simplePoll_displayResults(null, true);
            } else 
            {
                $('main#main').removeClass('liveResults');
                $(_this.options.selectors.resultbtn+ ' span').text('SEE LIVE RESULTS');

                _this.resetResults();
            }

            // location.hash = "#matchup";
        }

        /*
         * toggle description
         * show/hide the description text
         */
        NDMatchup.prototype.showHideDescription = function(e) 
        {
            e.preventDefault();

            var _this = e.data.context;

            $(this).prev('.moreP').toggleClass('active');

            if ($(this).children('i').hasClass('fa-angle-double-down')) 
            {
               $(this).children('i').removeClass('fa-angle-double-down');
               $(this).children('i').addClass('fa-angle-double-up');
               $(this).children('em').text('less');
            } else
            {
               $(this).children('i').addClass('fa-angle-double-down');
               $(this).children('i').removeClass('fa-angle-double-up');
               $(this).children('em').text('more');
            }
        }

        /*
         * parse the project id from the page
         * can be overwritten in SETTINGS.PROJECT
         * project id is required for application to work
         */
        NDMatchup.prototype.getProject = function()
        {
            var project = '';

            if (typeof $(this.options.selectors.wrapper).attr('data-prefix') != 'undefined')
            {
                project = $(this.options.selectors.wrapper).attr('data-prefix');
            }

            if (typeof $('.poster').attr('data-prefix') != 'undefined')
            {
                project = $('.poster').attr('data-prefix');
            }

            if (typeof settings.project != 'undefined')
            {
                project = settings.project;
            }

            return project;
        }

        NDMatchup.prototype.getRound = function()
        {
            var round = '';

            if (typeof $(this.options.selectors.wrapper).attr('data-round') != 'undefined')
            {
                round = $(this.options.selectors.wrapper).attr('data-round');
            }

            if (typeof settings.project != 'undefined')
            {
                round = settings.projectround;
            }

            return round;
        }

        /*
         * load all poll id's into an array and/or cookie
         * array filtered by category
         * contains poll id and section id if poll was voted on
         */
        NDMatchup.prototype.getPolls = function()
        {
            // check for cookies
            $.cookie.json = true;
            var elements = [];

            var cookiename = project+'-'+projectround; 

            if ($.cookie(cookiename) === null || $.cookie(cookiename) == "" || typeof $.cookie(cookiename) == 'undefined')
            {
                // $(this.options.selectors.itemwrapper+ '>div.mu').each(function () 
                // {
                //     if (typeof $(this).data('matchup') != 'undefined')
                //     {
                //         var item = {};
                //         item['poll'] = $(this).data('matchup');
                //         item['voted'] = '';

                //         elements.push(item);
                //     }
                // });

            } else // get all elements from the page
            {
                elements = $.cookie(cookiename);
            }

            return elements;
        }

        /*
         * update array and cookie
         * set vote index to the section id when vote is submitted
         */
        NDMatchup.prototype.updateCookieData = function(userdata)
        {       
            $.each(userdata, function(key, val) 
            {
                var found = false;
                for (var item in votecount)
                {
                    if (val.poll == votecount[item].poll)
                    {
                        votecount[item].voted = val.voted;
                        found = true;
                        break;
                    }
                }

                if (!found)
                {
                    votecount.push({
                        poll : val.poll,
                        voted : val.voted
                    });
                }
            });
                
            if (settings.cookies != false)
            {
                $.cookie(project+'-'+projectround, JSON.stringify(votecount), { expires: 1 });
            }
        }

        /*
         * update array and cookie
         * set vote index to the section id when vote is submitted
         */
        NDMatchup.prototype.updatePollData = function(pollID, sectionID)
        {       
            votecount = this.updatePollSection(votecount, pollID, sectionID);
                
            if (settings.cookies != false)
            {
                $.cookie(project+'-'+projectround, JSON.stringify(votecount), { expires: 1 });
            }
        }

        /* 
         * called by updatePollData(pollID, sectionID)
         * loops through the votes array and updates the vote (section) if poll is found 
         */
        NDMatchup.prototype.updatePollSection = function(votes, pollID, sectionID)
        {
            var found = false;
            $.each(votes, function(index, value) 
            {
                if (value.poll === pollID)
                {
                    votes[index].voted = sectionID;
                    found = true;
                    return false;
                }
            });

            if (!found)
            {
                votes.push({
                    poll : pollID,
                    voted : sectionID
                });
            }

            return votes;
        }

        /*
         * get poll results from simple poll system
         */
        NDMatchup.prototype.simplePoll_displayResults = function(pollID, fullResults) {

            var _this = this; 

            // exit function if nether pollID or PROJECT are not set
            if ((pollID == '' || pollID == null) && (project == '' || project == null)) { return; } 

            // var url = '/_common/php/templates/simple-poll/inc/getResults.php';
            var url = this.options.baseurl+'results';

            $.ajax({
                url: url,
                type: 'POST',
                dataType: 'json',
                data: {
                    poll_id : pollID,
                    round_id : projectround,
                    project_id : project,
                },
                success: function(response) 
                {
                    if (typeof response['user'] != 'undefined')
                    {
                        _this.updateCookieData(response['user']);
                    }

                    // calculate winner
                    if (typeof fullResults != 'undefined' && fullResults)
                    {
                        _this.showResults(response);
                    } else
                    {
                        _this.showSingleResults(response);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) 
                {
                    _this.notificationPopup("#popUp", "There was a problem retrieving the votes. Please try again later.");
                }
            });
        }

        /*
         * show results message on results page and on page load
         */
        NDMatchup.prototype.showResults = function(data)
        {
            var _this = this;

            if (typeof data['results'] == 'undefined' || data['status'] != 'success') 
            { 
                this.disableRemainingItems();
                return; 
            }
            
            for (var poll in data['results']) 
            {
                var result = { 
                    totalvotes: data['results'][poll]['total'],
                    poll : poll,
                };

                for (var pollitem in data['results'][poll]) 
                {
                    if(isNaN(pollitem)) { continue; } //title = $('#' +data['results'][i]['label']+ ' h2').text();
                    
                    result[pollitem] = {
                        id :    data['results'][poll][pollitem]['item_id'],
                        value : data['results'][poll][pollitem]['vote']
                    };
                }

                if ($('div[data-matchup='+poll+']').length > 0 && !isNaN(data['results'][poll]['total']))
                {
                    if ($('main#main').hasClass('liveResults') || $('main#main').hasClass('liveResults'))
                    {
                        this.showSingleResults(result);
                        continue;
                    }

                    if (votecount)
                    {
                        $.each(votecount, function(index, value) 
                        {
                            // only show votes that are stored in cookies
                            if (value.poll == result.poll && value.voted != '')
                            {
                                $('div[data-matchup='+poll+']').addClass('iVoted');
                                _this.successPoll(value.poll, value.voted);
                                _this.showSingleResults(result);
                                _this.setShareData(value.poll, value.voted);

                                return false;
                            }
                        });
                    }  
                }
            }

            this.disableRemainingItems();
        }

        /*
         * show single results message on matchup page
         */
        NDMatchup.prototype.showSingleResults = function(data)
        {
            var resultdata = this.processResults(data);

            var total = resultdata.totalvotes;

            var winnertotal = [],
                winneritem = [];

            for (var i=0; i < $('div[data-matchup='+resultdata.poll+'] section').length; i++)
            {
                var sectionID = $('div[data-matchup='+resultdata.poll+'] section').eq(i).data("post");

                var element = 'div[data-matchup='+resultdata.poll+'] section[data-post='+sectionID+']';

                var result = 0,
                    height = '0%',
                    votes = '0 VOTES';

                $.each(resultdata, function(key, item) 
                {
                    if (isNaN(key) || item.id != sectionID) { return true; }

                    result = parseInt(item.value);
                    height = (result > 0) ? Math.round(100 / total * result)+ '%' : '0%';
                    votes = (result == 1) ? result+ ' VOTE' : result+ ' VOTES';

                    return false;
                });

                $(element+ ' .pBar').css('height', height);
                $(element+ ' .percent b').text(height);
                $(element+ ' .percent em').text(votes);

                winnertotal.push(result);
                winneritem.push(element);
            }

            var maxValue = Math.max.apply(this, winnertotal);
            $.each(winnertotal, function(index, val)
            {
                if (val == maxValue)
                {
                    $(winneritem[index]).addClass('currentWinner');
                }
            });
        }

        /*
         * process the data return from simple poll
         * make it readable by JustGage
         * return default values if data was not reyurned successfully
         */
        NDMatchup.prototype.processResults = function(data)
        {
            var title;
            var result = [];

            if(data['status'] == 'success')
            {
                console.log('success: processResults');
                for(var item in data['results']) 
                {
                    result = { 
                        totalvotes: data['results'][item]['total'],
                        poll: item,
                    };

                    for (var i in data['results'][item])
                    {
                        result[item] = {
                            id: data['results'][item][i]['item_id'],
                            value: data['results'][item][i]['vote']
                        }
                    };
                }
            } else if (data.hasOwnProperty('totalvotes')) 
            {
                result = data;
            }

            return result;
        }

        NDMatchup.prototype.disableRemainingItems = function()
        {
            var _this = this;

            if ($('main#main').hasClass('liveResults') || $('main#main').hasClass('liveResults'))
            {
                $(this.options.selectors.matchup+':not(.voteFlag)').each(function(key, val)
                {
                    var pollID = $(this).data('matchup')
                    var empty = { 
                        totalvotes: 0,
                        poll : pollID,
                    };

                    $('div[data-matchup='+pollID+']').addClass('iVoted');
                    _this.successPoll(pollID, false);

                    $('div[data-matchup='+pollID+'] section').each(function(key, val)
                    {  
                        empty[key] = {
                            id :    $(this).data('post'),
                            value : 0
                        };
                    });

                    _this.showSingleResults(empty);
                });
            }
        }

        /*
         * reset results display om matchup item
         */
        NDMatchup.prototype.resetResults = function()
        {
            $(this.options.selectors.matchup).each(function(key, val)
            {
                if ($(this).hasClass('resultsFlag'))
                {   
                    $(this).removeClass('resultsFlag');
                    $(this).removeClass('voteFlag');
                    $('section', this).removeClass('currentWinner');
                    $('section', this).removeClass('myVote');
                    $('section', this).removeClass('notMyVote');
                }
            });
        }

        NDMatchup.prototype.triggerVote = function(e) 
        {
            e.preventDefault();

            var _this = e.data.context;

            var sectionID = $(this).closest(_this.options.selectors.poll).data("post");
            var pollID = $(this).closest("div.mu").data("matchup");

            if (!$(this).closest("div.mu").hasClass('voteFlag')) // restrict multiple votes on same item - element/class should not exist
            { 
                _this.polling_vote(pollID, sectionID);
            }
        }

        /*
         * submit vote to simple poll system
         */
        NDMatchup.prototype.polling_vote = function(pollID, sectionID) 
        {
            var _this = this; 

            var time = this.setTimer();

            if (pollID == '' || pollID == null || sectionID == '' || $('main#main').hasClass('ended') || !time) { return; } 

            var url = this.options.baseurl+'vote';

            $.ajax({
                url: url,
                type: 'POST',
                data: {
                    poll_id : pollID,
                    item_id : sectionID,
                    round_id : projectround,
                    project_id : project,
                },
                success: function(response) 
                {
                    if (response && response.hasOwnProperty('msg') && response.msg == 'success') 
                    {
                        _this.successPoll(pollID, sectionID); // disable poll and indicate vote
                        _this.updatePollData(pollID, sectionID); // save vote in array and cookie
                        _this.simplePoll_displayResults(pollID, true);
                        _this.setShareData(pollID, sectionID);
                        $('div[data-matchup='+pollID+']').addClass('iVoted');

                    } else {
                        _this.notificationPopup("#popUp", "Your vote could not be submitted.");
                    } 
                },
                error: function(jqXHR, textStatus, errorThrown) 
                {
                    _this.notificationPopup("#popUp", "There was a problem submitting your vote. Please try again later.");
                }
            });
        }

        /*
         * action on successful vote submission
         * highlight submitted vote
         * disable voting for that poll
         */
        NDMatchup.prototype.successPoll = function(pollID, sectionID)
        {
            var poll = 'div[data-matchup='+pollID+']'; //'div[data-matchup='+pollID+']';

            if (sectionID)
            {
                var section = 'div[data-matchup='+pollID+'] section[data-post='+sectionID+']';

                $(section).addClass("myVote");
                $(section+ ' a.vote').text("MY VOTE");
            } else
            {
                var section = 'div[data-matchup='+pollID+'] section';
            }
            
            $(section).siblings(this.options.selectors.poll).addClass("notMyVote");

            if ($('main#main').hasClass('liveResults') && !$(poll).hasClass('voteFlag'))
            {
                $(poll).addClass("resultsFlag");
            }

            $(poll).addClass("voteFlag");
        }

       

        /*
         * application time
         * indicates the remaining time the poll is open for voting
         */
        NDMatchup.prototype.setTimer = function() 
        {
            var deadline = false;

            if ($('.countdown').length > 0) 
            {
                var now = new Date();

                var year = $('.countdown').attr("data-year");
                var month = $('.countdown').attr("data-month");
                var day = $('.countdown').attr("data-day");
                var hour = 0; // default

                if (typeof $('.countdown').attr("data-hour") != 'undefined' && $('.countdown').attr("data-hour") != '' && $('.countdown').attr("data-hour").length)
                {
                    hour = $('.countdown').attr("data-hour");
                }

                deadline = new Date(year, month - 1, day, hour);
                
                if (deadline <= now)
                {
                    $('main#main').addClass('ended');
                    $('main#main').addClass('liveResults');
                }
            }

            return deadline;
        }

        /*
         * Project Shares
         * set project wide share Data
         */
         NDMatchup.prototype.setProjectShareData = function()
        { 
            var _this = this;

            $('main#main header .simpleShare').remove();
            $('main#main header').prepend(sharehtml);

            var title = (typeof $(this.options.selectors.socialtextall).data('fbtitle') != 'undefined') ? $(this.options.selectors.socialtextall).data('fbtitle') : $('meta[property="og:title"]').attr("content");
            var description = (typeof $(this.options.selectors.socialtextall).data('fbtext') != 'undefined') ? $(this.options.selectors.socialtextall).data('fbtext') : $('meta[property="og:description"]').attr("content");
            var imgURL = $('meta[property="og:image"]').attr("content");
            var loc = 'http://' +window.location.hostname+window.location.pathname;

            $('header .simpleShare').find("a").each(function() 
            {
                var wheight = $(this).attr('width');
                var wwidth = $(this).attr('height');
                var isVideo = false;
                var thistitle = title;

                if ($(this).hasClass('tw'))
                {
                    thistitle = (typeof $(_this.options.selectors.socialtextall).data('twtext') != 'undefined') ? $(_this.options.selectors.socialtextall).data('twtext') : $('meta[name="twitter:title"]').attr("content");
                }

                bindSimpleShare($(this), wheight, wwidth, loc, thistitle, isVideo, imgURL, description);
            });
        }       

        /*
         * Individula Shares
         * set share Data for one matchup 
         */
        NDMatchup.prototype.setShareData = function(poll, sectionID)
        {
            // return;
            var _this = this;

            var sectionEle = 'div[data-matchup='+poll+'] section[data-post='+sectionID+']';
            var pollEle = 'div[data-matchup='+poll+']';

            if ($(pollEle+ ' .simpleShare').length > 0) { return; }

            var isVideo = false;
            var title = (typeof $(this.options.selectors.socialtext).data('fbtitle') != 'undefined') ? $(this.options.selectors.socialtext).data('fbtitle') : $('meta[property="og:title"]').attr("content");
            var description = (typeof $(this.options.selectors.socialtext).data('fbtext') != 'undefined') ? $(this.options.selectors.socialtext).data('fbtext') : $('meta[property="og:description"]').attr("content");
            var imgURL = $(sectionEle+ ' img').attr('src');
            var loc = (typeof $(sectionEle).data('url') != 'undefined') ? $(sectionEle).data('url') : 'http://' +window.location.hostname+window.location.pathname+ '#' +poll;

            $(this.options.placeholders).each(function(key, val)
            {
                var regex = new RegExp(val, 'g');
                var replace = '';

                switch(val)
                {
                    case '{VOTE}':
                        replace = $(sectionEle+'.myVote h2').text();
                        break;
                    case '{URL}':
                        replace = loc;
                        break;
                    case '{HANDLE}':
                        replace = $(sectionEle).data('twitter');
                        break;
                }
                title = title.replace(regex, replace);
                description = description.replace(regex, replace);
            });

            $(pollEle+ ' '+this.options.selectors.share).append(sharehtml);

            $(pollEle+ ' .simpleShare').find("a").each(function() 
            {
                var wheight = $(this).attr('width');
                var wwidth = $(this).attr('height');
                var thistitle = title;

                if ($(this).hasClass('tw'))
                {
                    thistitle = (typeof $(_this.options.selectors.socialtext).data('twtext') != 'undefined') ? $(_this.options.selectors.socialtext).data('twtext') : $('meta[name="twitter:title"]').attr("content");
                
                    $(_this.options.placeholders).each(function(key, val)
                    {
                        var regex = new RegExp(val, 'g');
                        var replace = '';

                        switch(val)
                        {
                            case '{VOTE}':
                                replace = $(sectionEle+'.myVote h2').text();
                                break;
                            case '{URL}':
                                replace = loc;
                                break;
                            case '{HANDLE}':
                                replace = $(sectionEle).data('twitter');
                                break;
                        }
                        thistitle = thistitle.replace(regex, replace);
                    });
                }

                bindSimpleShare($(this), wheight, wwidth, loc, thistitle, isVideo, imgURL, description);
            });
        }


        /*
         * application time
         * indicates the remaining time the poll is open for voting
         */
        NDMatchup.prototype.initCountdown = function(deadline) 
        {
            if (deadline) 
            {
                $('.countdown').countdown({until: deadline, compact: true});
            }
        }

        /*
         * Scroll to Hash
         * if hastag is set in url scroll to corresponding id
         */
        NDMatchup.prototype.loadHash = function() 
        {
            var hash = window.location.hash;
            hash = hash.replace('#', '');

            if (hash)
            {   
                $("html, body").animate({ scrollTop: $('div[data-matchup='+hash+']').offset().top }, 700);
            } 
        }

        /*
         * set error and notifications popup
         */
        NDMatchup.prototype.notificationPopup = function(item, message)
        {
            if ($(item).is(":hidden"))
            {
                $(item+ ' div.content').html(message);
                $(item+ ' div.inner').addClass('error');
                $(item).fadeIn();
            } else
            {
                $(item).fadeOut();
                $(item+ ' div.content').html('');
                $(item+ ' div.inner').removeClass('error');
            }
        };

}(window, document, jQuery));

nd_map = new NDMatchup();