/*
Copyright (c) 2011 LockeVN Thach Nguyen, http://gurucore.com/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function ($) {
    $.fn.YouTubePicker = function (options) {
        // default option
        var defaults = {
            MaxResults: 3				    				    /* number of YouTube results, per "page" */
		    , OrderBy: null								        /* what to order the results by */
		    , Author: null								        /* Author of the video */

		    , ShowNumOfViews: true							        /* show number of views for the video */
		    , Thumbnail: 'small'						        /* small: 120x90 | large: 480 x 360 */

            , ControlIdSuffix: ''                               /* should give the unique string here if you have multiply of YouTubePicker. Using elements in this plugin will fetch by "id + ControlIdSuffix" */
            , ControlQueryHolder: '.YouTubePickerQuery'              /* selector to take a element to be query holder (where we take string to query YouTube) */
            , ControlSearchButton: '.YouTubePickerSearch'            /* selector to take a element to be SearchButton. Click this element to start search. */
            , ControlVideoPlayerHolder: '.YouTubePickerVideoPlayer'  /* selector to take a element to render VideoPlayer */
            , ControlVideoList: '.YouTubePickerVideoList'           /* selector to take a element to render VideoList */
            , ControlSelectedUrlHolder: '.YouTubePickerSelectedUrl'  /* When user click to select a video, assign the video's url to this input */

            , InitVideoUrl: ''                                  /* Init if no search query existed, you can put YouTubeVideoId here or the full Url */
            , PlayerWidth: '640'                                /* setting for player */
            , PlayerHeight: '363'                               /* setting for player */
            , AutoPlay: true                                    /* AutoPlay video right after user click an item in the list */
            , ShowRelated: true                                 /* show relate video after finish playing */
            , AllowFullScreen: false                            /* enable FullScreen button of Player */
        };
        options = $.extend(defaults, options);

        return this.each(function () {
            var $container = $(this);

            $(options.ControlSearchButton).click(function () {
                /// <summary>
                /// handler click on search button
                /// </summary>

                var requestUrl = 'http://gdata.YouTube.com/feeds/api/videos?alt=json&max-results=' + options.MaxResults;
                try {
                    _RequestYouTubeVideos(requestUrl);
                } catch (ex) { }

                return false;
            });

            $(options.ControlQueryHolder).keydown(function (event) {
                /// <summary>
                /// handler press Enter in query textbox
                /// </summary>

                if ((event.which && event.which == 13) || (event.keyCode && event.keyCode == 13)) {
                    $(options.ControlSearchButton).trigger('click');
                    return false;
                }
                else {
                    return true;
                }
            });

            //-------------------------------------------------------//
            // take the init video and play it if any
            $(options.ControlVideoPlayerHolder + "").html(_GetPlayerHtml(_GetYouTubeIdFromUrl(options.InitVideoUrl)));
            _AssignValueToDivOrTextBox(options.ControlSelectedUrlHolder, options.InitVideoUrl);


            $('a.navigation').click(function () {
                /// <summary>
                /// rebind the list whenever user click to change page
                /// </summary>
                try {
                    _RequestYouTubeVideos($(this).attr('href'));
                } catch (ex) { }

                return false;
            });


            /**
            * Util function, assign value to element. Element can be div, span, or input
            */
            function _AssignValueToDivOrTextBox(selectorToElement, valueToAssign) {
                try {
                    $(selectorToElement).val(valueToAssign);
                } catch (ex) { }
                try {
                    $(selectorToElement).text(valueToAssign);
                } catch (ex) { }
            }


            function _RequestYouTubeVideos(requestUrl) {
                /// <summary>
                /// fire the jsonp request to get data from YouTube Search API
                /// </summary>
                var query = $(options.ControlQueryHolder).val();
                if (options.Author != null) {
                    requestUrl += '&author=' + options.Author;
                }
                if (options.OrderBy != null) {
                    requestUrl += '&orderby=' + options.OrderBy;
                }
                if (query != null) {
                    requestUrl += '&q=' + query;
                }

                $.ajax({
                    type: "GET",
                    url: requestUrl,
                    dataType: 'jsonp',
                    global: false,
                    success: _OnYouTubeSuccess,
                    error: function (result) {
                        $(options.ControlVideoList).html('<p>Error connecting to YouTube</p>');
                    }
                        ,
                    ajaxComplete: function (data) {
                        return false;
                    }
                });
            }


            function _BuildNavigation(feed) {
                /// <summary>
                /// Build the navigation link Prev and Next base on the return url in the feed (if existed)
                /// </summary>
                if (feed.link) {
                    var nextLink = null;
                    var prevLink = null;

                    for (var i = 0; i < feed.link.length; i++) {
                        var link = feed.link[i];
                        if (link.rel == 'next') {
                            nextLink = link.href;
                        }
                        else if (link.rel == 'previous') {
                            prevLink = link.href;
                        }
                    }

                    if (nextLink) {
                        $('.navigation.next').attr('href', nextLink).show();
                    }
                    else {
                        $('.navigation.next').hide();
                    }
                    if (prevLink) {
                        $('.navigation.prev').attr('href', prevLink).show();
                    }
                    else {
                        $('.navigation.prev').hide();
                    }
                }
            }


            function _ParseYouTubeFeedItem(feedData) {
                /// <summary>
                /// Extract what we want from YouTube feedData                
                /// </summary>
                var dto = [];
                
                dto.id = _StripFeature(feedData.link[0].href.substring(feedData.link[0].href.indexOf('=') + 1, feedData.link[0].href.length));
                dto.url = feedData.link[0].href;
                dto.title = feedData.title.$t;
                if (options.Thumbnail == 'large') {
                    var index = 0;  // first thumb is large size
                } else {
                    var index = feedData.media$group.media$thumbnail.length - 1; // take the last small thumb
                }
                dto.thumbnail = feedData.media$group.media$thumbnail[index].url;
                dto.description = feedData.media$group.media$description.$t;
                dto.author = feedData.author[0].name.$t;

                if (feedData.yt$statistics) {
                    dto.views = feedData.yt$statistics.viewCount;
                }
                else if (!feedData.yt$statistics) {
                    dto.views = '0';
                }

                return dto;
            }


            /**
            * Process the json result, render the list
            */
            function _OnYouTubeSuccess(result) {
                var feed = result.feed;
                var rfeed = feed.entry || [];
                var relVideos = [];

                var $ctrVideoList = $(options.ControlVideoList);

                // build the navigation
                _BuildNavigation(feed);

                if (rfeed.length > 0) {
                    $(rfeed).each(function (i) {
                        /// <summary>
                        /// from feeditem from YouTube, build the video data object
                        /// </summary>

                        relVideos[i] = _ParseYouTubeFeedItem(rfeed[i]);

                    }).ready(function () {
                        relVideos.sort(_ArraySort);
                        var $itemsHtml = $('<div>');    // temporary DOM node to append VideoItem to

                        $(relVideos).each(function (i) {
                            /// <summary>
                            /// Create each list item
                            /// </summary>

                            $itemsHtml.append('<li class="VideoItem">');
                            videoItem = $itemsHtml.find('.VideoItem:last');

                            videoItem.append('<div class="VideoThumb">');
                            videoThumb = videoItem.find('.VideoThumb');
                            $('<a>').addClass('YouTubelink').attr('href', relVideos[i].url).append('<img src="' + relVideos[i].thumbnail + '">').appendTo(videoThumb);

                            videoItem.append('<div class="VideoInfo">');
                            videoInfo = videoItem.find('.VideoInfo');
                            videoInfo.append('<a href="' + relVideos[i].url + '" title="' + relVideos[i].description + '" class="VideoTitle YouTubelink">' + relVideos[i].title + '</a>');

                            if (options.ShowNumOfViews) {
                                videoInfo.append('<span class="VideoNumOfViews">' + relVideos[i].views + ' views</span>');
                            }
                        });

                        // clear the list
                        $ctrVideoList.empty().append($itemsHtml.children());
                    });



                    // load inital video after finish rendering the list
                    // take the first video in the list, take it link, take it href, assign to the Player
                    var firstVid = $ctrVideoList.children("li:first-child").addClass("selected").find("a").eq(1).attr("href");
                    $(options.ControlVideoPlayerHolder + "").html(_GetPlayerHtml(_GetYouTubeIdFromUrl(firstVid)));


                    $ctrVideoList.find("li a").unbind('click').bind('click', function () {
                        /// <summary>
                        /// load video on click of a in li
                        /// </summary>
                        try {
                            var selectedUrl = $(this).attr("href");

                            // return the selectedUrl to outside (try catch to avoid error in IE)
                            _AssignValueToDivOrTextBox(options.ControlSelectedUrlHolder, selectedUrl);

                            $(options.ControlVideoPlayerHolder + "").html(_GetPlayerHtml(_GetYouTubeIdFromUrl(selectedUrl)));
                            $(this).parent().parent().parent("ul").find("li.selected").removeClass("selected");
                            $(this).parent().parent("li").addClass("selected");
                        } catch (ex) { }

                        return false;
                    });

                } else {
                    /* if we have no YouTube videos returned, let's tell user */
                    $ctrVideoList.html('<p>There is no result</p>');
                }
            }   // end _OnYouTubeSuccess




            function _ArraySort(a, b) {
                if (a.title < b.title) {
                    return -1;
                }
                else if (a.title > b.title) {
                    return 1;
                }
                else {
                    return 0;
                }
            }

            function _StripFeature(vidID) {
                var featureLoc = vidID.indexOf('&feature=YouTube_gdata');
                if (featureLoc >= 0) {
                    return vidID.substring(0, featureLoc);
                } else {
                    return vidID;
                }
            }


            /**
            * Create a Player HTML code to play an YouTubeID, and return it HTML string
            */
            function _GetPlayerHtml(YouTubeVideoId) {
                // if YouTubeVideoId is null or empty, we provide an empty div with same dimension of the Player
                // This will fix a bug of IE (IE will load the swf forever if object movie is empty and/or embbed src is empty
                if (!YouTubeVideoId) {
                    return '<div style="width:' + options.PlayerWidth + 'px;height:' + options.PlayerHeight + 'px">';
                }

                var AutoPlay = "";
                var ShowRelated = "&rel=0";
                var fullScreen = "";
                if (options.AutoPlay) AutoPlay = "&autoplay=1";
                if (options.ShowRelated) ShowRelated = "&rel=1";
                if (options.AllowFullScreen) fullScreen = "&fs=1";

                var html = '';

                html += '<object height="' + options.PlayerHeight + '" width="' + options.PlayerWidth + '">';
                html += '<param name="movie" value="http://www.YouTube.com/v/' + YouTubeVideoId + AutoPlay + ShowRelated + fullScreen + '"> </param>';
                html += '<param name="wmode" value="transparent"> </param>';
                if (options.AllowFullScreen) {
                    html += '<param name="allowfullscreen" value="true"> </param>';
                }
                html += '<embed src="http://www.YouTube.com/v/' + YouTubeVideoId + AutoPlay + ShowRelated + fullScreen + '"';
                if (options.AllowFullScreen) {
                    html += ' allowfullscreen="true" ';
                }
                html += 'type="application/x-shockwave-flash" wmode="transparent"  height="' + options.PlayerHeight + '" width="' + options.PlayerWidth + '"></embed>';
                html += '</object>';

                return html;
            };


            function _GetYouTubeIdFromUrl(url) {
                /// <summary>
                /// use RegEx too grab a YouTube id from a (clean, no querystring) url (thanks to http://jquery-howto.blogspot.com/2009/05/jYouTube-jquery-YouTube-thumbnail.html)
                /// <return>empty string if cannot match.</return>
                /// </summary>
                if (url && url != '') {
                    try {
                        var ytid = url.match("[\\?&]v=([^&#]*)");
                        ytid = ytid[1];
                        return ytid;
                    }
                    catch (ex) { }
                }
                return '';
            };
        });
    };
})(jQuery);