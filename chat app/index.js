
        // REGISTER DOM ELEMENTS
        var fbid = '';
        var imgclass = '';
        var divdir = '';
        var messageField = $('#emoji-txt');
        var messageList = $('#example-messages');
        var lastfid = '1';
        var lastdir = 'L';
        var newdir = 'L';
        var authUserName = '';

        //************************* Emojis ********************************
        //*****************************************************************
        var $wysiwyg = $('.emojis-wysiwyg').emojiarea({ wysiwyg: true });
        var $wysiwyg_value = $('#emojis-wysiwyg-value');

        $wysiwyg.on('change', function () {
            $wysiwyg_value.text($(this).val());
        });
        $wysiwyg.trigger('change');
        //****************************************************************

        $("#firechat-wrapper").hide();
        // CREATE A REFERENCE TO FIREBASE (Messages)
        var refMessages = new Firebase("https://hybrid.firebaseio.com/Messages");
        // CREATE A REFERENCE TO FIREBASE (Users)
        var refUsers = new Firebase("https://hybrid.firebaseio.com/Users");


        // prefer pop-ups, so we don't navigate away from the page
        refMessages.authWithOAuthPopup("facebook", function (err, authData) {
            if (err) {
                if (err.code === "TRANSPORT_UNAVAILABLE") {
                    // fall-back to browser redirects, and pick up the session
                    // automatically when we come back to the origin page
                    refMessages.authWithOAuthRedirect("facebook", function (err, authData) { });
                }
            } else if (authData) {
                if (authData) {
                    $("#firechat-wrapper").show();
                    authUserName = authData.facebook.displayName;
                    fbid = authData.facebook.id;

                    //*************************************************
                    //Save the user's profile into Firebase so we can list users,
                    //Use them in Security and Firebase Rules, and show profiles
                    //ref.child('users').child(authData.uid).set(authData);
                    refUsers.child(authData.uid).set(authData);
                    //*************************************************
                    //Get the bg color of last submitted text message based on fabebook id in firebase.
                    //*************************************************
                    getLastBgColor(fbid);
                    //*************************************************
                    //Get the last submitted text message direction in firebase.
                    //*************************************************
                    getLastDirection();
                    //*************************************************

                    // Add a callback that is triggered for each chat message.
                    refMessages.limitToLast(10).on('child_added', function (snapshot) {

                        //GET DATA
                        var data = snapshot.val();
                        var fbid_d = data.fbid;
                        var username_d = data.name;
                        var message_d = data.text;
                        var dir_d = data.dir;
                        var date_d = data.currentdate;
                        var bgcolor_d = data.bgcolor;
                        var strProfilePic = "https://graph.facebook.com/" + fbid_d + "/picture";

                        if (dir_d) {
                            imgclass = dir_d == "R" ? "pull-right" : "pull-left";
                            divdir = dir_d == "R" ? "divTxtR" : "divTxtL";
                        }

                        //CREATE ELEMENTS MESSAGE & SANITIZE TEXT
                        var messageElement = $("<li class='media' f='" + fbid_d + "'>");
                        var divmediabody = $("<div class='media-body'>");
                        var divmedia = $("<div class='media'>");
                        var a = $("<a class='" + imgclass + "' href='#'><img class='media-object img-circle' src='" + strProfilePic + "' /></a>");
                        var divmediabody2 = $("<div class='media-body " + divdir + "'>");
                        divmediabody2.css('background', bgcolor_d);
                        messageElement.append(divmediabody);
                        divmediabody.append(divmedia);
                        divmedia.append(a);
                        divmedia.append(divmediabody2);

                        var usernamediv = $("<small class='text-muted'>");
                        divmediabody2.html(message_d);

                        divmediabody2.append(usernamediv);
                        usernamediv.html("<br />" + date_d);

                        //ADD MESSAGE
                        messageList.append(messageElement);

                    });

                }
                else {
                    refMessages.authAnonymously(function (error, authData) {
                        if (error) {
                            console.log(error);
                        }
                    });
                }//if
            }
        });


        // LISTEN FOR KEYPRESS EVENT
        messageField.keypress(function (e) {
           if (e.keyCode == 13) {
                pushData();
            }
        });

        $("#btnSend").click(function () {
            pushData();
        });


        function pushData() {

            //FIELD VALUES
            var username = authUserName;
            var message = $(".emoji-wysiwyg-editor").html();
            //Clientside Datetime
            var cdate = new Date();

            //***********************************************************
            //Set current text message direction to push it to firebase.
            //***********************************************************
            getLastDirection();
            lastdir = $('#hf_lastdir').val();
            lastfid = $('#hf_lastfid').val();

            if (lastfid != fbid) {
                newdir = lastdir == "L" ? "R" : "L";
            }
            else {
                newdir = lastdir;
            }
            //***********************************************************
            bgcolor = $('#hf_bgcolor').val();
            if (!bgcolor) {
                //Generate random color to set the background color of the text body.
                var back = ["#dbeef3", "#f2dcdb", "#fac08f", "#ccc1d9", "#c4bd97"];
                bgcolor = back[Math.floor(Math.random() * back.length)];
            }

            //***********************************************************
            // Google search functionality
            //***********************************************************
            var keyword = '';
            var bSearchImg = false;
            var _url = 'https://ajax.googleapis.com/ajax/services/search/web?v=1.0&q=';
            if (message.toLowerCase().match('^s ') ) {
                keyword = message.substring(2, message.length);
                _url = _url + keyword
            }
            if (message.toLowerCase().match('^s img ')) {
                keyword = message.substring(6, message.length);
                _url = 'https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q=' + keyword;
                bSearchImg = true;
            }

            if (keyword.length > 0) {
                $.ajax({
                    url: _url,
                    type: "GET",
                    dataType: 'jsonp',
                    async: 'true',
                    success: function (data) {
                        var strResult = '';
                        if (!bSearchImg) {
                            $.each(data.responseData.results, function (i, rows) {
                                strResult = strResult + rows.title + "<br/>" + "<a href='" + rows.url + "' target='_blank'>" + rows.url + "</a>" + "<br/><br/>";
                            });
                        }
                        else
                        {
                            $.each(data.responseData.results, function (i, rows) {
                                strResult = strResult + rows.title + "<br/>" + "<a href='" + rows.url + "' target='_blank'><img src='" + rows.url + "' height='100' width='100'></img></a>" + "<br/><br/>";
                            });
                        }

                        message = message + "<br/>" + strResult;
                        //SAVE DATA TO FIREBASE.
                        refMessages.push({ name: username, text: message, fbid: fbid, bgcolor: bgcolor, currentdate: cdate.toLocaleString(), dir: newdir });
                    }
                });

            }
            else {
                //SAVE DATA TO FIREBASE.
                refMessages.push({ name: username, text: message, fbid: fbid, bgcolor: bgcolor, currentdate: cdate.toLocaleString(), dir: newdir });
            }
            
            $(".emoji-wysiwyg-editor").html('');

        }

        //**********************************************************************************
        //Get the bg color of last submitted text message based on fabebook id in firebase.
        //**********************************************************************************
        function getLastBgColor(vfbid) {
            refMessages.orderByChild('fbid').equalTo(vfbid).limitToLast(1).on('child_added', function (snapshot) {
                var data = snapshot.val();
                $('#hf_bgcolor').val(data.bgcolor);
            });

        }

        //***********************************************************
        //Get the last submitted text message direction in firebase.
        //***********************************************************
        function getLastDirection() {
            refMessages.limitToLast(1).on('child_added', function (snapshot) {
                var data = snapshot.val();
                $('#hf_lastfid').val(data.fbid);
                $('#hf_lastdir').val(data.dir);
            });
        }

    
    