"use strict"

var packageList = [];
var lastUpdate = "";
var dataRequestUrl = 'data/data.json';
var listContainer = document.getElementById("list-container");
var detailContainer = document.getElementById("detail-container");
var helpContainer = document.getElementById("help-container");
var browserMode = document.getElementById("browser-mode");
var localStorageUsedSpace = document.getElementById("localStorageUsedSpace");
var usedSpace = '';

startApp();

// start application
function startApp() {
    console.log('Application start.')
    displayBrowserMode();
    getData();
};

// a package was ckicked
function clickDetail(id) {
    packageManager(getPackageFromLocal(id));
}

// click buttom to refresh local storage used space
function clickRefreshUsedLocalStorage() {
    localStorageUsedSpace.innerHTML = spinnerHtml('UsedLocalStorage') + '<br/>';
    $.when(asyncMe(displayUsedLocalStorage())).then(
        function(status) {
            localStorageUsedSpace.innerHTML = usedSpace;
        },
        function(status) {}
    );
}

// select data from server or from local storage
function getData() {
    if (navigator.onLine) {
        getDataFromServer();
    } else {
        getDataFromLocalStorage();
    }
};

// load data from server
function getDataFromServer() {
    var client = new HttpClient();
    console.log('Get data from server.');
    client.get(dataRequestUrl, function(response) {
        if (response && response.length > 0) {
            packageList = JSON.parse(response);
            console.log('Server response: ', packageList);
            dataFromServerManager();
        } else {
            console.log('There was no response from the server, it will search the local storage.')
            getDataFromLocalStorage();
        }
    });
};

// executes all async operations with data from server
function dataFromServerManager() {
    console.log("Start using data from server.");
    // display list data on page
    $.when(asyncMe(displayListData())).then(
        function(status) {
            console.log("Display list data on page", status);
            // change source of images to get then from web
            $.when(asyncMe(displayImages('online'))).then(
                function(status) {
                    console.log("Change source of images to get then from web", status);
                    // remove from local storage all objects that no longer exist on the server
                    $.when(asyncMe(removeOutdatedObjsFromLocalStorage())).then(
                        function(status) {
                            console.log("Remove from local storage all objects that no longer exist on the server", status);
                            // save data from server to local storage
                            $.when(asyncMe(persistDataFromServer())).then(
                                function(status) {
                                    console.log("Save data from the server that does not already exist in local storage", status);
                                    refreshKeepOfflineState();
                                },
                                function(status) {
                                    console.log("Save data from the server that does not already exist in local storage", status);
                                }
                            );
                        },
                        function(status) {
                            console.log("Remove from local storage all objects that no longer exist on the server", status);
                        }
                    );
                },
                function(status) {
                    console.log("Change source of images to get then from web", status);
                }
            );
        },
        function(status) {
            console.log("Display list data on page", status);
        }
    );
}

// get data from local storage
function getDataFromLocalStorage() {
    console.log('Get data from local storage.');
    if (localStorage) {
        packageList = [];
        for (var id in localStorage)
            packageList.push(JSON.parse(localStorage.getItem(id)));
        console.log('Local storage response: ', packageList);
        dataFromLocalStorageManager();
    } else {
        console.log('Data does not exist in local storage.');
    }
};

// executes all async operations with data from local storage
function dataFromLocalStorageManager() {
    console.log("Start using data from local storage.");
    // display list data on page
    $.when(asyncMe(displayListData())).then(
        function(status) {
            console.log("Display list data on page", status);
            // change source of images to get then from web
            $.when(asyncMe(displayImages('offline'))).then(
                function(status) {
                    console.log("Change source of images to get then from local storage", status);
                    refreshKeepOfflineState();
                },
                function(status) {
                    console.log("Change source of images to get then from local storage", status);
                }
            );
        },
        function(status) {
            console.log("Display list data on page", status);
        }
    );
}

// get package from local storage 
function getPackageFromLocal(id) {
    if (localStorage) {
        for (var localId in localStorage) {
            if (localId === id) {
                return JSON.parse(localStorage.getItem(id));
            }
        }
    } else {
        console.log('Data does not exist in local storage.');
    }
    return "";
}

// executes package operations
function packageManager(pack) {
    console.log("Show pack", pack);
    // display package detail
    $.when(asyncMe(displayDetail(pack))).then(
        function(status) {
            console.log("Display package detail", status);
            // change the source of one image
            $.when(asyncMe(displayImage(pack, navigator.onLine ? "online" : "offline"))).then(
                function(status) {
                    console.log("Change the source of one image", status);
                },
                function(status) {
                    console.log("Change the source of one image", status);
                }
            );
        },
        function(status) {
            console.log("Display package detail", status);
        }
    );
}

// remove from local storage all objects that no longer exist on the server
function removeOutdatedObjsFromLocalStorage() {
    if (packageList && packageList.length > 0 && localStorage && localStorage.length > 0) {
        for (var id in localStorage) {
            var localPack = JSON.parse(localStorage.getItem(id));
            // check if local storage obj can be removed
            if (localStorage && localPack != null && !localPack.keepOffline) {
                // check if local storage obj still exist on server, if not remove from local storage
                var result = $.grep(packageList, function(e) { return e.id === id; });
                if (result.length === 0)
                    localStorage.removeItem(id);
            }
        }
    }
    return true;
}

// Save data from the server that does not already exist in local storage
function persistDataFromServer() {
    if (packageList && packageList.length > 0 && localStorage) {
        for (var i = 0; i < packageList.length; i++) {
            var pack = packageList[i];
            // If obj does not already exist in local storage try to save it
            if (JSON.parse(localStorage.getItem(pack.id)) === null) {
                try {
                    localStorage.setItem(pack.id, JSON.stringify(pack));
                } catch (e) {
                    console.log('The local storage limit was exceeded');
                    break;
                }
            }
        }
    }
    return true;
}

// save image on local storage in base64
function saveImageOnLocalStorage(img) {
    var id = img.getAttribute("id");
    var localObj = JSON.parse(localStorage.getItem(id));
    if (localObj && localObj.base64Img.length === 0) {
        try {
            localObj.base64Img = getBase64Image(img);
            localStorage.removeItem(id);
            localStorage.setItem(id, JSON.stringify(localObj));
        } catch (e) {
            // Not enough space to write the image to local storage
            localObj.base64Img = "";
            localStorage.setItem(id, JSON.stringify(localObj));
            return false;
        }
    }
    return true;
}

// remove images until have space for image
function clearSpaceForImage(myObj, img) {
    var saved = false;
    for (var localId in localStorage) {
        if (localId != myObj.id) {
            if (clearLocalStorageImage(localId)) {
                if (saveImageOnLocalStorage(img)) {
                    saved = true;
                    break;
                }
            }
        }
    }
    return saved;
}

// clear an image from local storage
function clearLocalStorageImage(id) {
    var localObj = JSON.parse(localStorage.getItem(id));
    if (!localObj.keepOffline) {
        localObj.base64Img = "";
        localStorage.removeItem(id);
        localStorage.setItem(id, JSON.stringify(localObj));
    } else {
        return false;
    }
    return true;
}

// refresh keep offline state
function refreshKeepOfflineState() {
    for (var id in localStorage) {
        var localObj = JSON.parse(localStorage.getItem(id));
        if (localObj != null && localObj.keepOffline) {
            var elem = document.getElementById("keepOffline" + id);
            if (elem != null)
                elem.classList.remove("hidden");
        }
    }
}

// save info in local storage for future use (if no space for information remove other information not mark for storage)
function keepOfflineChecked(id, elem) {
    var localObj = JSON.parse(localStorage.getItem(id));
    console.log(localObj.name, 'keep info checked.');
    localObj.keepOffline = true;
    if (localObj.base64Img.length === 0) {
        if (!navigator.onLine) {
            console.log('Can not be bookmarked because it does not have the image in base64 format locally');
            displayAlert('displayAlert', 'Não é possivel manter esta informação pois encontra-se em modo offline e a imagem não existe localmente.', 'warning');
            elem.checked = false;
            return false;
        }
        var img = document.getElementById(id);
        if (!saveImageOnLocalStorage(img)) {
            if (!clearSpaceForImage(localObj, img)) {
                console.log("I can not keep", localObj.img, "because there is no space in the local storage");
                displayAlert('displayAlert', 'Não é possivel manter esta informação pois não existe espaço no local storage para guardar a imagem.<br/>Remova alguns registos dos favoritos.', 'warning');
                elem.checked = false;
                return false;
            }
        }
    }
    localStorage.removeItem(id);
    localStorage.setItem(id, JSON.stringify(localObj));
    return true;
}

// un mark information as not important keep
function keepOfflineUnchecked(id) {
    var localObj = JSON.parse(localStorage.getItem(id));
    localObj.keepOffline = false;
    localStorage.removeItem(id);
    localStorage.setItem(id, JSON.stringify(localObj));
    console.log(localObj.name, 'keep info unchecked.');
}

//convert an loaded image to base64
function getBase64Image(img) {
    var canvas = document.createElement("canvas");
    var realSize = realImgDimension(img);
    canvas.width = realSize.naturalWidth;
    canvas.height = realSize.naturalHeight;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var dataURL = canvas.toDataURL("image/png");
    return dataURL;
}

// get real dimensions of an image
function realImgDimension(img) {
    var i = new Image();
    i.src = img.src;
    return {
        naturalWidth: i.width,
        naturalHeight: i.height
    };
}

// display list data on page
function displayListData() {
    var myHtml = "";
    clearAllContainers();
    if (packageList && packageList.length > 0) {
        myHtml = getListHtml();
        helpContainer.innerHTML = "Click no botão para ver os detalhes.";
    } else {
        myHtml = '<h4 class="text-warning">Não foram encontrados registos.</h4>';
    }
    listContainer.innerHTML = myHtml;
    scrollTop();
    return true;
};

// display package detail
function displayDetail(pack) {
    var myHtml = "";
    clearAllContainers();
    helpContainer.innerHTML = "Click no botão voltar para a lista para regressar à pagina inicial.";
    if (pack) {
        myHtml = getDetailHtml(pack);
    } else {
        myHtml = '<h4 class="text-warning">Não foi encontrado o registo.</h4>';
    }
    myHtml += '<br/>';
    myHtml += '<buttom class="btn btn-default btn-block" onclick="getData()">Voltar para a lista</buttom>'
    detailContainer.innerHTML = myHtml;
    scrollTop();
    var elem = document.getElementById('keepOffline');
    if (elem) {
        elem.addEventListener('click', function() {
            if (elem.checked) {
                keepOfflineChecked(pack.id, elem);
            } else {
                keepOfflineUnchecked(pack.id);
            }
        });
    }
    return true;
}

// change source of images to get then from web or from local storage
function displayImages(origin) {
    if (packageList && packageList.length > 0) {
        for (var i = 0; i < packageList.length; i++) {
            displayImage(packageList[i], origin);
        }
    }
    scrollTop();
    return true;
}

// change the source of one image
function displayImage(pack, origin) {
    var img = document.getElementById(pack.id);
    var loader = document.getElementById("loader" + pack.id);
    if (origin === 'online')
        img.setAttribute('src', pack.img);
    else {
        if (pack.base64Img != "") {
            img.setAttribute('src', pack.base64Img);
        } else {
            img.setAttribute('src', '/tripointOnDemand/images/offline.jpg');
        }
    }
    img.addEventListener('load', function() {
        if (origin === 'online')
            removeSpinnerShowAndSaveImage(loader, img);
        else
            removeSpinnerShowImage(loader, img);
    });
    return true;
}

// remove spinner
function removeSpinner(loader) {
    loader.classList.remove("loader");
}

// remove spinner, and show image
function removeSpinnerShowImage(loader, img) {
    loader.classList.remove("loader");
    if (img) {
        img.classList.remove("hidden");
        img.removeEventListener('load', function() {});
    }
}

// remove a specific spinner and show image, then save image in base64 on local storage
function removeSpinnerShowAndSaveImage(loader, img) {
    loader.classList.remove("loader");
    img.classList.remove("hidden");
    img.removeEventListener('load', function() {});
    $.when(asyncMe(saveImageOnLocalStorage(img))).then(
        function(status) {
            console.log(img.getAttribute("src"), "saved on local storage");
        },
        function(status) {
            console.log('Not enough space to write the image', img.getAttribute("src"), 'on local storage');
        }
    );
}

// build html for list
function getListHtml() {
    var myHtml = "";
    for (var i = 0; i < packageList.length; i++) {
        var pack = packageList[i];
        myHtml += '<div>';
        myHtml += '<div id="keepOffline' + pack.id + '" class="text-right hidden"><span class="label label-success">Favorito</span></div>';
        myHtml += spinnerHtml(pack.id);
        myHtml += '<img id="' + pack.id + '" src="" alt="' + pack.name + '" class="img-responsive center-block hidden">';
        myHtml += '<h5>' + pack.name + '</h5>';
        myHtml += '<div class="text-warning">' + pack.date + '</div>';
        myHtml += '<br/>';
        myHtml += '<buttom class="btn btn-default btn-block" onclick="clickDetail(' + "'" + pack.id + "'" + ')">Ver detalhes</buttom>';
        myHtml += '</div>';
        myHtml += '<hr/>';
    }
    return myHtml;
};

// build html for detail
function getDetailHtml(pack) {
    var myHtml = "";
    if (pack) {
        myHtml = '<div>'
        myHtml += spinnerHtml(pack.id);
        myHtml += '<img id="' + pack.id + '" src="" alt="' + pack.name + '" class="img-responsive center-block hidden">';
        myHtml += '<hr/>';
        myHtml += '<h4>' + pack.name + '</h4>';
        myHtml += '<div class="text-warning">' + pack.date + '</div>';
        myHtml += '<div><strong>' + pack.id + '</strong></div>';
        myHtml += '<hr/>';
        myHtml += '<div><p>' + pack.description + '</p></div>';
        if (pack.includedServices) {
            myHtml += '<hr/>';
            myHtml += '<h5 class="text-warning">Serviços Incluidos</h5>';
            myHtml += '<div>' + pack.includedServices + '</div><br>';
        }
        myHtml += '<div class="text-danger text-right"><strong>' + Number(pack.price).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,') + ' €</strong></div>';
        myHtml += '</div>';
        myHtml += '<br />';
        myHtml += '<div class="checkbox text-info text-center">';
        myHtml += '<label><input type="checkbox" id="keepOffline"' + (pack.keepOffline ? 'checked' : '') + '>Manter dados em modo offline</label>';
        myHtml += '</div>';
        myHtml += '<div id="displayAlert"></div>';
    }
    return myHtml;
}

// html to display a spinner
function spinnerHtml(id) {
    var myHtml = "";
    myHtml = '<div id="' + "loader" + id + '" class="loader center-block">';
    myHtml += '</div>';
    myHtml += '<br/>';
    return myHtml;
}

// display browser mode (online or offline)
function displayBrowserMode() {
    if (navigator.onLine) {
        browserMode.innerHTML = '<h4>O browser encontra-se em modo <span class="text-info">ONLINE</span></h4>';
    } else {
        browserMode.innerHTML = '<h4>O browser encontra-se em modo <span class="text-danger">OFFLINE</span></h4>';
    }
};

// returns the space used in local storage
function displayUsedLocalStorage() {
    var result = "";
    if (localStorage) {
        var totalSpace = 0;
        for (var id in localStorage)
            totalSpace += byteCount(localStorage.getItem(id));
        result = formatBytes(totalSpace) + " occupied by local storage";
    } else {
        result = "Local storage not suported";
    }
    usedSpace = '<h4 id="localStorageUsedSpaceMsg" class="text-warning text-center">' + result + '</h4>';
    return true;
}

// display an alert inside an element
function displayAlert(elemId, msg, type) {
    var displayType = 'alert-' + type;
    var myHtml = '<div class="alert ' + displayType + ' alert-dismissible" role="alert">';
    myHtml += '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
    myHtml += msg + '</div>'
    document.getElementById(elemId).innerHTML = myHtml;
}

// move win to top
function scrollTop() {
    window.scrollTo(0, 0);
};

// clear help container
function clearHelpContainer() {
    helpContainer.innerHTML = "";
};

// clear list container
function clearListContainer() {
    listContainer.innerHTML = "";
};

// clear detail container
function clearDetailContainer() {
    detailContainer.innerHTML = "";
};

// clear all containers
function clearAllContainers() {
    clearHelpContainer();
    clearListContainer();
    clearDetailContainer();
};

// byte size of string
function byteCount(s) {
    return encodeURI(s).split(/%..|./).length - 1;
}

// convert bytes in ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
function formatBytes(bytes, decimals) {
    if (bytes === 0) return '0 Bytes';
    var k = 1000,
        dm = decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Http client async
function HttpClient() {
    this.get = function(aUrl, aCallback) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function() {
            if (anHttpRequest.readyState === 4 && anHttpRequest.status === 200)
                aCallback(anHttpRequest.responseText);
        }
        anHttpRequest.open("GET", aUrl, true);
        anHttpRequest.send(null);
    }
};

// Transform a function into asynchronous function
function asyncMe(myFunction) {
    var job = $.Deferred();
    if (myFunction) {
        job.resolve("successfully completed");
    } else {
        job.reject("an error has occurred");
    }
    return job.promise();
}
