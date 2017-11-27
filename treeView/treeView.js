/*
 * 
 * this is quite nice, but good luck getting this to do DnD
 * in a generic way, let it be noted...
 * 
 */

(function() {
	'use strict'
	
	console.log("iefe");
	$ = jQuery;
	
	function toggleClick(event) {
		console.log("menuToggle click", event);
		$(event.target)
		.parentsUntil('li')
		.parent()
		.toggleClass('collapsed');
	}
	
	function renderItem(dataItem) {
		var $toggleElement= $('<div>')
		    .addClass('itemToggle')
		    .addClass('glyphicon')
		    ;
		
		if (dataItem.children.length == 0) {
			$toggleElement.css('color', 'transparent');
		} else {
			$toggleElement.on('click', toggleClick);
		}
 						  
 						  
		var $itemElement= $('<div>')
						  .addClass('itemBanner')
						  .append($toggleElement)
	                      .append($('<div>')
	                    		  .addClass('itemCaption')
	                    		  .text(dataItem.name))
		                  ;
		
		var $childrenElement= $('<div>')
		                      .addClass('children')
		                      ;

		buildTree(dataItem.children, $childrenElement.get());

		return $('<li>')
		       .addClass('treeItem')
		       .addClass('collapsed')
		       .append($itemElement)
		       .append($childrenElement);		
	}
	
	function buildTree(data, container) {
		var $container= $(container);
		
		var $treeElement= $('<ul>');
		
		data.forEach(function(dataItem){
			$treeElement.append(renderItem(dataItem));
		});
		
		$container
		.empty()
		.append($treeElement)
		;
	}
	
    //TODO rethink data source concept. having it come from an attribute on the target DIV is useful for some purposes because 
    //  multiple instances of treeView can be initialised with 1 call, but what if I already have an array of tree items from 
    //  some other source?
    //  a possbile solution would be to use data: URLs for this. Let's try to do that in the demo.
    
	$.fn.extend({
		treeView : function(options) {

			return this.each(function(index, treeContainer) {			// "return this" for all intents and purposes
				var $this;												//TODO do I want to keep this?
				$this = $(this);
				console.log("tree: this, treeContainer", this, treeContainer);
				
				if (treeContainer.dataset.hasOwnProperty('dataSource')) {
					$this
					.addClass('treeContainer')
					.addClass('loading')
					;
					
					$.get(treeContainer.dataset.dataSource)
					.done(function(data, textStatus, jqXHR){
						console.log("got data from source", data);
						$this.removeClass('loading');
						new buildTree(data, treeContainer);
					})
                    .fail(function(jqXHR, textStatus, errorThrown) {
                        console.log("get failed", textStatus, errorThrown, jqXHR);
                    })
                    .always(function() {
                        console.log("get request complete");
                    })
					;
				}
				
			});
		}
	});
}());