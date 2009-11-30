/**
 * This file is part of the navigation extension for OntoWiki
 *
 * @author     Sebastian Dietzold <sebastian@dietzold.de>
 * @copyright  Copyright (c) 2009, {@link http://aksw.org AKSW}
 * @license    http://opensource.org/licenses/gpl-license.php GNU General Public License (GPL)
 *
 */

/**
 * The main document.ready assignments and code
 */
$(document).ready(function() {
    /* some used variables */
    navigationContainer = $('#navigation-content');
    navigationInput = $("#navigation-input");
    navigationWindow = $("#navigation");
    navigationExploreUrl = urlBase + 'navigation/explore';
    navigationMoreUrl = urlBase + 'navigation/more';
    navigationListUrl = urlBase + 'list';

    navigationInput.livequery('keypress', function(event) {
        // do not create until user pressed enter
	if ((event.which == 13) && (event.currentTarget.value != '') ) {
            navigationEvent('search', event.currentTarget.value);
            $(event.currentTarget).val('');
	}
    });

    /* first start */
    navigationEvent('init');
});

/**
 * Setups the Navgiation Parameters and start the request
 */
function navigationEvent (navEvent, eventParameter) {
    var setup, navType;

    /* init config when not existing or resetted by user */
    if ( ( typeof navigationSetup == 'undefined' ) || (navEvent == 'reset') || (navEvent == 'setType') ) {
        // set the default or setType config
        if (navEvent == 'setType') {
            navType = eventParameter;
        } else {
            navType = navigationConfig['defaults']['config'];
        }
        var config = navigationConfig['config'][navType];

        // the limit
        var limit = navigationConfig['defaults']['limit'];

        // set the state
        var state = {};
        state['limit'] = limit;
        state['path'] = new Array;
        // pack state and config into setup value for post
        setup = {'state': state, 'config': config };
    } else {
        setup = navigationSetup;
    }
    // delete old search string
    delete(setup['state']['searchString']);

    switch (navEvent) {
        case 'init':
        case 'reset':
        case 'setType':
            // remove init sign and setup module title
            navigationContainer.removeClass('init-me-please');
            $('#navigation h1.title').text('Navigation: '+setup['config']['name']);
            break;

        case 'showResourceList':
            setup['state']['parent'] = eventParameter;
            break;

        case 'navigateDeeper':
            // save path element
            if ( typeof setup['state']['parent'] != 'undefined' ) {
                setup['state']['path'].push(setup['state']['parent']);
            }
            // set new parent
            setup['state']['parent'] = eventParameter;
            break;
        
        case 'navigateHigher':
            // count path elements
            var pathlength = setup['state']['path'].length;
            if ( typeof setup['state']['parent'] == 'undefined' ) {
                // we are at root level, so nothing higher than here
                return;
            }
            if (pathlength == 0) {
                // we are at the first sublevel (so we go to root)
                delete(setup['state']['parent']);
            } else {
                // we are somewhere deeper ...
                // set parent to the last path element
                setup['state']['parent'] = setup['state']['path'][pathlength-1];
                // and delete the last path element
                setup['state']['path'].pop();
            }
            break;

        case 'navigateRoot':
            // we are at root level, so nothing higher than here
            // exception: after a search, it should be also rootable
            if ( ( typeof setup['state']['parent'] == 'undefined' )
                && ( setup['state']['lastEvent'] != 'search' ) ){
                return;
            }
            delete(setup['state']['parent']);
            setup['state']['path'] = new Array;
            break;
            
        case 'search':
            setup['state']['searchString'] = eventParameter;
            break;

        case 'setLimit':
            setup['state']['limit'] = eventParameter;
            delete(setup['state']['offset']);
            break;

        case 'toggleHidden':
            if ( typeof setup['state']['showHidden'] != 'undefined' ) {
                delete(setup['state']['showHidden']);
            } else {
                setup['state']['showHidden'] = true;
            }
            break;

        case 'toggleEmpty':
            // if no state is set, use default value from config
            if ( typeof setup['state']['showEmpty'] == 'undefined' ) {
                if ( typeof setup['config']['showEmptyElements'] != 'undefined' ) {
                    setup['state']['showEmpty'] = setup['config']['showEmptyElements'];
                } else {
                    setup['state']['showEmpty'] = true
                }
            } else if (setup['state']['showEmpty'] == false) {
                setup['state']['showEmpty'] = true;
            } else {
                setup['state']['showEmpty'] = false;
            }
            break;

        case 'toggleImplicit':
            // if no state is set, use default value from config
            if ( typeof setup['state']['showImplicit'] == 'undefined' ) {
                if ( typeof setup['config']['showImplicitElements'] != 'undefined' ) {
                    setup['state']['showImplicit'] = setup['config']['showImplicitElements'];
                } else {
                    setup['state']['showImplicit'] = true
                }
            } else if (setup['state']['showImplicit'] == false) {
                setup['state']['showImplicit'] = true;
            } else {
                setup['state']['showImplicit'] = false;
            }
            break;
        case 'more':
            if( setup['state']['offset'] !== undefined  ){
                setup['state']['offset'] = setup['state']['offset']*2;
            }else{
                setup['state']['offset'] = setup['state']['limit']; 
            }
            break;

        default:
            alert('error: unknown navigation event: '+navEvent);
            return;
        }

    setup['state']['lastEvent'] = navEvent;
    navigationSetup = setup;
    if( navEvent == 'more' ){
        navigationUpdateLoad (navEvent, setup);
    }else{
        navigationLoad (navEvent, setup);
    }
    return;
}

/**
 * request the navigation
 */
function navigationLoad (navEvent, setup) {
    if (typeof setup == 'undefined') {
        alert('error: No navigation setup given, but navigationLoad requested');
        return;
    }

    // preparation of a callback function
    var cbAfterLoad = function(){
        $.post(navigationExploreUrl, { setup: $.toJSON(setup) },
            function (data) {
                navigationContainer.empty();
                navigationContainer.append(data);
                // remove the processing status
                navigationInput.removeClass('is-processing');

                switch (navEvent) {
                    case 'navigateHigher':
                        navigationContainer.css('marginLeft', '-100%');
                        navigationContainer.animate({marginLeft:'0px'},'slow');
                        break;
                    case 'navigateDeeper':
                        navigationContainer.css('marginLeft', '100%');
                        navigationContainer.animate({marginLeft:'0px'},'slow');
                        break;
                    default:
                        navigationContainer.slideDown('fast');
                }

                navigationPrepareList();
            }
        );
    }

    // first we set the processing status
    navigationInput.addClass('is-processing');
    navigationContainer.css('overflow', 'hidden');

    switch (navEvent) {
        case 'navigateHigher':
            navigationContainer.animate({marginLeft:'100%'},'slow', '', cbAfterLoad);
            break;
        case 'navigateDeeper':
            navigationContainer.animate({marginLeft:'-100%'},'slow', '', cbAfterLoad);
            break;
        default:
            navigationContainer.slideUp('fast', cbAfterLoad);
    }

    return ;
}

/**
 * update the navigation
 */
function navigationUpdateLoad (navEvent, setup) {
    if (typeof setup == 'undefined') {
        alert('error: No navigation setup given, but navigationLoad requested');
        return;
    }
    
    navigationMore = $("#naviganion-more");

    // preparation of a callback function
    var cbAfterLoad = function(){
        $.post(navigationExploreUrl, { setup: $.toJSON(setup) },
            function (data) {
                navigationMore.remove();
                navigationContainer.append(data);
                // remove the processing status
                //navigationMore.removeClass('is-processing');

                navigationPrepareList();
            }
        );
    }

    // first we set the processing status
    navigationMore.html('&nbsp;&nbsp;&nbsp;&nbsp;');
    navigationMore.addClass('is-processing');
    //navigationContainer.css('overflow', 'hidden');
    
    cbAfterLoad();

    return ;
}

/*
 * This function creates navigation events
 */
function navigationPrepareList () {
    // the links to deeper navigation entries
    $('.navDeeper').click(function(event) {
        navigationEvent('navigateDeeper', $(this).parent().attr('about'));
        return false;
    });

    // the link to the root
    $('.navFirst').click(function(event){
        navigationEvent('navigateRoot');
        return false;
    })
    
    // the link to higher level
    $('.navBack').click(function(event){
        navigationEvent('navigateHigher');
        return false;
    })
}
