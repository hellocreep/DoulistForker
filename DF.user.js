// ==UserScript==
// @name       	DoulistForker 
// @namespace   DoulistForker
// @include     http://movie.douban.com/doulist/*
// @include     http://music.douban.com/doulist/*
// @include     http://book.douban.com/doulist/*
// @include     http://www.douban.com/doulist/*
// @version     1
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_addStyle
// @grant GM_xmlhttpRequest
// @grant GM_log
// @grant GM_openInTab
// @grant GM_registerMenuCommand
// ==/UserScript==

/* Style */

GM_addStyle('#fork_btn { \
		margin-bottom: -8px; \
	} \
	#fork_btn.disabled { \
		opacity: 0.4; \
	} \
	.fork-load { \
		display: inline-block; \
		width: 16px; \
		height: 16px; \
		margin: -5px 5px; \
		background: url("http://img3.douban.com/pics/loading.gif"); \
	}'
);


/* Utils */

/* Selector */
function $(select) {
	var name = select.substring(1);
		switch(select.charAt(0)) {
			case '#':
				return document.getElementById(name);
			case '.':
				return document.getElementsByClassName(name);
			case '/':
				return document.getElementsByName(name);
			default: 
				return document.getElementsByTagName(name);
		}
}

/* Xpath */
function xpath(query, context) {
	return document.evaluate(context?(query.indexOf('.')==0?query:'.' + query):query, context || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
};


/* Object to MetaData */
function implodeUrlArgs(obj) {
	var a = [];
	for ( var k in obj ) {
		a.push( k +'='+ encodeURI( obj[k]) );
	}
	console.log(a)
	return a.join('&');
}

/* Loadings tip */
var loading = {
	show: function() {
		var fork_btn = $('#fork_btn');
		var load_tip = document.createElement('div');
		load_tip.className = 'fork-load';
		insertBefore(load_tip, fork_btn);
	},
	hide: function() {
		var load_tip = xpath('//div[@class="fork-load"]').snapshotItem(0);
		load_tip.style.display = 'none';
	}
}

/* CSS */
function addCss(dom, css) {
	for( var i in css ) {
		dom.style[i] = css[i];
	}
}

/* Append */
function insertBefore(dom, target) {
	target.parentNode.insertBefore(dom, target);
}

function insertAfter(dom, target) {
	if( target.previousSibling.length > 0 ) {
		insertBefore(dom, target.nextSibling);
	}else{
		target.parentNode.appendChild(dom);	
	}
}

/* Cookies */
function getCookie(c_name) {
	if (document.cookie.length > 0){
		c_start = document.cookie.indexOf(c_name + '=');
		if (c_start!=-1){ 
			c_start = c_start + c_name.length + 1;
			c_end = document.cookie.indexOf(';',c_start);
			if (c_end == -1){ c_end = document.cookie.length;}
			// 去掉双引号
			return unescape(document.cookie.substring(c_start,c_end).replace(/(^\"*)|(\"*$)/g, ""));
		}
	}
	return '';
}

/* Doulist info */
var href = window.location.href;

var DL = {

	movie: {
		name: 'movie',
		dl_submit: '创建电影豆列',
		create_url: 'http://movie.douban.com/doulist/new?cat=1002',
		doulist_url: 'http://movie.douban.com/doulist/',
		key: '1002',
		flag: '1'
	},
	music: {
		name: 'music',
		dl_submit: '创建音乐豆列',
		create_url: 'http://music.douban.com/doulist/new?cat=1003',
		doulist_url: 'http://music.douban.com/doulist/',
		key: '1003',
		flag: '1'
	},
	book: {
		name: 'book',
		dl_submit: '创建图书豆列',
		create_url: 'http://book.douban.com/doulist/new?cat=1001',
		doulist_url: 'http://book.douban.com/doulist/',
		key: '1001',
		flag: '1'
	},
	thing: {
		name: 'thing',
		dl_submit: '创建东西豆列',
		create_url: 'http://www.douban.com/doulist/new?cat=3065',
		doulist_url: 'http://www.douban.com/doulist/',
		key: '3065'
	},
	album: {
		name: 'album',
		dl_submit: '创建相册豆列',
		create_url: 'http://www.douban.com/doulist/new?cat=1026',
		doulist_url: 'http://www.douban.com/doulist/',
		key: '1026'
	},
	note: {
		name: 'note',
		dl_submit: '创建日记豆列',
		create_url: 'http://www.douban.com/doulist/new?cat=1015',
		doulist_url: 'http://www.douban.com/doulist/',
		key: '1015'
	},
	getType: function() {
		// var type = href.substring(7, url.indexOf('.'));
		// 舞台剧日记等并没有独立二级域名
		try{
			// var type = xpath('//a[contains(@href,"/doulist/new?cat=")]').snapshotItem(0).href;
			var type = $( '.lnk-doulist-add' )[0].href;
			if( type.indexOf('3065') !== -1 ){
				return DL.thing;
			}
			if( type.indexOf('1026') !== -1 ){
				return DL.album;
			}
		}catch(e){}

		if( href.indexOf('movie') !== -1 ){
			return DL.movie;
		}
		if( href.indexOf('music') !== -1 ){
			return DL.music;
		}
		if( href.indexOf('book') !== -1 ){
			return DL.book;
		}
		if( href.indexOf('note') !== -1 ){
			return DL.note;
		}
		// switch(type) {
		// 	case 'movie':
		// 		return DL.movie;
		// 	case 'music':
		// 		return DL.music;
		// 	case 'book':
		// 		return DL.book;
		// }
	}
}

/* Fork */
function fork() {

	var rec = $('.rec')[0]; 
	var fork_btn = document.createElement('a');
	fork_btn.id = 'fork_btn';
	fork_btn.className = 'redbutt';
	fork_btn.href = 'javascript:;'
	fork_btn.innerHTML = '<span>Fork</span>';
	rec.parentNode.insertBefore(fork_btn, rec);

	var fork = $('#fork_btn');
	$('#fork_btn').addEventListener('click', function(e) {
		var target = e.target.parentNode;
		if( target.getAttribute('class').indexOf('disabled') !== -1 ) {
			console.log('disabled');
			return;	
		}else{

			target.setAttribute('class', target.getAttribute('class')+' disabled');
			loading.show();

			createNewDoulist();
		}
	}, false);
}

function createNewDoulist() {

	var ck = getCookie('ck');
	if( ck === null ) {
		return;
	} else {
		var	dl_about = $('.indent')[0].textContent,
			dl_title = $(' h1')[0].textContent,
			this_doulist = window.location.href;

		GM_xmlhttpRequest({
			method: 'POST',
			url: DL_type.create_url,
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'User-Agent':'Mozilla/5.0 (Windows NT 6.1; rv:19.0) Gecko/20100101 Firefox/19.0',
				'Content-type':'application/x-www-form-urlencoded'
			},
			data: implodeUrlArgs({
				"ck": ck,
				"dl_about": dl_about,
				"dl_submit": '创建豆列',
				"dl_title": dl_title+' (forked from '+this_doulist+')',
				"dl_type": DL_type.key
			}),
			onload: function(result) {
				console.log(result);
				var fork_id = result.finalUrl.replace(DL_type.doulist_url,'').replace('/','');
				console.log('created');
				console.log(fork_id);
				collectSubjects( fork_id );
				// storeForked(fork_id);
			},
			onerror: function(err) {
				console.log(err);
			}
		});
	}
}


// 存储已经fork的豆列
function storeForked(fork_id) {
	var dl = [];
	var forked_doulist = GM_getValue('focked_doulist', null);
	if( forked_doulist === null ) {
		dl.push(fork_id);
	}else{
		dl = forked_doulist.split(',');
		dl.push(fork_id);
	}
	GM_setValue('forked_doulist', dl.toString())	
}

// 收集豆列中的所有item
// TODO
// 相册收集出错
function collectSubjects(fork_id) {
	var item_wrap = $( '.doulist_item' );
	var items = [];
	var links = [];
	
	// first page	
	if( DL_type.name == 'note' || DL_type == 'album' ) {
		for(var i = 0; i < item_wrap.length; i++) {
			items.push( xpath( '//div[@class="title"]/a').snapshotItem(i).href );
		}
		
	} else {
		for(var i = 0; i < item_wrap.length; i++) {
			items.push( xpath( '//tr[@class="doulist_item"]/td/a' ).snapshotItem(i).href );
		}
	}
	

	if( $('.paginator')[0] !== undefined ) {
		var page = $('.paginator')[0].childNodes;
		for(var i = 0; i < page.length; i++) {
			if( page[i].nodeName === 'A' ){
				links.push(page[i].href);
			}
		}

		for(var i = 0; i < links.length; i++ ) {
			GM_xmlhttpRequest({
				method: 'GET',
				url: links[i],
				headers: {
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'User-Agent':'Mozilla/5.0 (Windows NT 6.1; rv:17.0) Gecko/20100101 Firefox/17.0'
				},
				onload: function(result) {
					var cont = document.createElement( 'div' );
					cont.innerHTML = result.responseText;
					var more_item;
					if( DL_type.name == 'note' || DL_type == 'album' ) {
						more_item = xpath( '//div[@class="title"]/a', cont );
					} else {
						more_item = xpath( '//tr[@class="doulist_item"]/td/a', cont );
					}
					
					for(var i = 0; i < more_item.snapshotLength; i++) {
						console.log(more_item.snapshotItem(i));
						var item_href = more_item.snapshotItem(i).href
						items.push( item_href );
					}
					console.log('collected');
					addSubjects( fork_id, items );
				}
			});
		}
	}else{
		console.log('collected');
		console.log(items);
		addSubjects( fork_id, items );	
	}
}

// 如果豆列少于五部电影会无法提交成功 最少也要提交5个subject
// 最简单的解决办法是为每个豆列都加一个空subject的字符串tail
// 为豆列添加item
function addSubjects(id, items){
	var add_url = DL_type.doulist_url+id+'/add_multi';
	var new_item = [];
	for(var i = 0; i < items.length; i++ ) {
		var k = 'subject=' + encodeURIComponent( items[i] );
		new_item.push( k );
	}

	var tail = '&subject=http%3A%2F%2F&subject=http%3A%2F%2F&subject=http%3A%2F%2F&subject=http%3A%2F%2F';
	GM_xmlhttpRequest({
		method: 'POST',
		url: add_url,
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'User-Agent':'Mozilla/5.0 (Windows NT 6.1; rv:17.0) Gecko/20100101 Firefox/17.0',
			'Content-type':'application/x-www-form-urlencoded',
		}, 
		data: 'ck='+getCookie('ck')+'&'+new_item.join( '&' )+tail,
		onload: function(result) {
			loading.hide();
			console.log('ck='+getCookie('ck')+'&'+new_item.join( '&' ))
			console.log('done');
		}
	});

}

/* RUN */

DL_type = DL.getType();

if( href.indexOf('doulist') !== -1 ) {
	console.log(DL_type);
	fork();
}