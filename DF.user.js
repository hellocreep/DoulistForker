// ==UserScript==
// @name        test
// @namespace   test
// @include     http://movie.douban.com/*
// @version     1
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_addStyle
// @grant GM_xmlhttpRequest
// @grant GM_log
// @grant GM_openInTab
// @grant GM_registerMenuCommand
// ==/UserScript==
/*
TODO
0. 整理代码
1. 为fork按钮添加样式
2. fork增加process提示
3. 在电影页面增加快速添加到豆列功能
4. 自己的豆列不能fork，已经fork的豆列不能fork
5. userscript include 页面
6. 给fork from 添加链接
7. 给除了电影豆列以外的其他豆列增加fork功能
*/

GM_addStyle('#fork_btn \
	{ \
		display: inline-block; \
		margin-left: 10px; \
		line-height: 0; \
	}'
)

// Selector
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

// Xpath
function xpath(query, context) {
	return document.evaluate(context?(query.indexOf('.')==0?query:'.' + query):query, context || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
};


// Object to MetaData for post a form
function implodeUrlArgs(obj) {
	var a = [];
	for ( var k in obj ) {
		a.push( k +'='+ encodeURIComponent(obj[k]) );
	}
	return a.join('&');
}

// 获取不断变化的ck值
function getCK() {

	GM_xmlhttpRequest({
		method: 'GET',
		url: 'http://movie.douban.com/doulist/new?cat=1002', 
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:17.0) Gecko/20100101 Firefox/17.0',
		},
		onload: function(result) {
			//貌似是因为页面带有javascript无法解析,必须盛放在DOM中
			var cont = document.createElement('div');
			cont.innerHTML = result.responseText;
			ck = xpath( "//input[@name='ck']", cont ).snapshotItem(0).value;
			GM_setValue( 'doulist_ck', ck );
			// fork();
		},
		onerror: function(err) {
			console.log(err);
		}
	});
}

function fork() {

	var rec = $('.rec')[0]; 
	var fork_btn = document.createElement('span');
	fork_btn.id = 'fork_btn';
	fork_btn.innerHTML = '<a class="">Fork</a>';
	rec.parentNode.insertBefore(fork_btn, rec);

	var fork = $('#fork_btn');
	$('#fork_btn').addEventListener('click', function(e) {

		getCK();
		createNewDoulist();
	}, false);
}

function createNewDoulist() {

	var ck = GM_getValue( 'doulist_ck', null ),
		dl_about = $('.indent')[0].textContent,
		dl_title = $(' h1')[0].textContent,
		this_doulist = window.location.href;

	GM_xmlhttpRequest({
		method: 'POST',
		url: 'http://movie.douban.com/doulist/new?cat=1002',
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'User-Agent':'Mozilla/5.0 (Windows NT 6.1; rv:17.0) Gecko/20100101 Firefox/17.0',
			'Content-type':'application/x-www-form-urlencoded',
		},
		data: implodeUrlArgs({
			"ck": ck,
			"dl_about": dl_about,
			"dl_submit": "创建电影豆列",
			"dl_title": dl_title+' (fork form '+ this_doulist + ')'
		}),
		onload: function(result) {
			var fork_id = result.finalUrl.replace('http://movie.douban.com/doulist/','').replace('/','');
			collectSubjects( fork_id );
			alert('created')
		},
		onerror: function(err) {
			alert(err)
			console.log(err);
		}
	});
}

// 收集豆列中的所有item
function collectSubjects(fork_id) {
	var item_wrap = $( '.doulist_item' );
	var items = [];
	var links = [];

	// first page
	for(var i = 0; i < item_wrap.length; i++) {
		items.push( item_wrap[i].firstChild.childNodes[1].href );
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
					var more_item = xpath( '//tr[@class="doulist_item"]/td/a', cont );
					for(var i = 0; i < more_item.snapshotLength; i++) {
						console.log(more_item.snapshotItem(i));
						var item_href = more_item.snapshotItem(i).href
						items.push( item_href );
					}
					alert('collected')
					addSubjects( fork_id, items );
				}
			});
		}
	}else{
		alert('collected');
		addSubjects( fork_id, items );	
	}
}

// TODO
// 如果豆列少于五部电影会无法提交成功 貌似最少也要提交5个subject
// 最简单的解决办法是为每个豆列都加一个空subject的字符串tail
// 为豆列添加item
function addSubjects(id, items){
	var add_url = 'http://movie.douban.com/doulist/'+id+'/add_multi';
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
		data: 'ck='+GM_getValue('doulist_ck')+'&'+new_item.join( '&' )+tail,
		onload: function(result) {
			console.log('ck='+GM_getValue('doulist_ck')+'&'+new_item.join( '&' ))
			alert('done')
		}
	});

}

fork();