
%%[
    SET @dev = true
]%%
<script type="text/javascript" runat="server">
    Platform.Load("Core", "1.1.5");
    //TRY & CATCH einbauen
    // Init Response Object
    var responseJSON = {};
    // Access-control
    var ip = Platform.Request.ClientIP();
    var origin = Platform.Request.GetRequestHeader('Referer')
    // Comes from LandingPage 
    var dev = Variable.GetValue("@dev");
    // Add to Response Object
    responseJSON.ip = ip;
    responseJSON.origin = origin;
    responseJSON.dev =  dev;
    // Start Timer
    var timeJSON = {};
    timeJSON.start = new Date().getTime();
    responseJSON.version = '0.2';
    
    // Retrieve Data from Frontend and assign values to Response Object
    var jsonpost = Platform.Request.GetPostData();
    var json = Platform.Function.ParseJSON(jsonpost);

    var mode = json.mode; 
    responseJSON.mode = mode; 
    var getEmailId = json.emailId;
    responseJSON.getEmailId = getEmailId; 
    var getAssetId = json.assetId;
    responseJSON.getAssetId = getAssetId; 
    var zeitungName = json.zeitungName;
    responseJSON.zeitungName = zeitungName;
    var sendTime = json.scheduledTime;
    responseJSON.sendTime = sendTime;
    Variable.SetValue('@sendTime',sendTime);
    var scheduledTime = json.scheduledTime;
    responseJSON.scheduledTime = scheduledTime;
    Variable.SetValue('@scheduledTime',scheduledTime);
    var newsletterName = json.newsletterName;
    responseJSON.newsletterName = newsletterName;
    var newsletterPermission = json.newsletterPermission;
    responseJSON.newsletterPermission = newsletterPermission;
    var newsletterId = json.newsletterPermission;
    responseJSON.newsletterId = newsletterId;
    var nlName = json.nlName;
    responseJSON.nlName = nlName;
    var AutorEmail = json.AutorEmail;
    responseJSON.AutorEmail = AutorEmail;
    // Get Author Meta Data
    var AutorName = Platform.Function.Lookup("NewsletterAutoren","Autor","email",AutorEmail);
    responseJSON.AutorName = AutorName;
    var AutorPosition = Platform.Function.Lookup("NewsletterAutoren","position","email",AutorEmail);
    responseJSON.AutorPosition = AutorPosition; 
    var autorImageURL = Platform.Function.Lookup("NewsletterAutoren","position","autorImageURL",AutorEmail);
    responseJSON.autorImageURL = autorImageURL;
    // Get Newsletter Meta Data
    var newsletterType = Platform.Function.Lookup("ENT.NewsletterTypes","nlType","Id",newsletterPermission);
    responseJSON.newsletterType = newsletterType;
    var nlType = Platform.Function.Lookup("ENT.NewsletterTypes","nlType","Id",newsletterPermission);
    responseJSON.nlType = nlType;
    var brand = Platform.Function.Lookup("ENT.NewsletterTypes","brand","Id",newsletterPermission);
    responseJSON.brand = brand;
    var newsletterLogName = dev == false ? newsletterPermission : "DEV_" + newsletterPermission;
    //responseJSON.nlName = newsletterLogName;
    Variable.SetValue('@newsletterName',newsletterName);
    // More Data from Frontend to help construct the Email
    var nlStructure = json.nlStructure;
    responseJSON.nlStructure = nlStructure;
    var nlBetreff = json.Betreff;
    responseJSON.nlBetreff = nlBetreff;
    var nlPreHeader = json.Preheader;
    responseJSON.nlPreHeader = nlPreHeader;
    var introTextHeadline = json.introTextHeadline;
    responseJSON.introTextHeadline = introTextHeadline;
    var introText = json.introText;
    responseJSON.introText = introText;
    //artikel und dazugehörige categories
    var articlesJSON = json.articlesJSON;
    //remove backslashes
    //articlesJSON = articlesJSON.replace(/\\/g, '');
    responseJSON.articlesJSON = articlesJSON;
    var NLMID = Platform.Function.Lookup("ENT.NewsletterTypes","MID","Id",newsletterPermission);
    responseJSON.NLMID = NLMID;
</script>
%%[
    SET @timestamp = SystemDateToLocalDate(NOW())
    SET @schedDate = RequestParameter("scheduledTime")
    IF EMPTY(@schedDate) THEN
        SET @longTimestamp = properCase(FormatDate(@timestamp, "l", "", "de-DE"))
    ELSE
        SET @longTimestamp = properCase(FormatDate(@sendTime, "l", "", "de-DE"))
    ENDIF
    SET @shortTimestamp = FormatDate(@timestamp, "YYYY-MM-DD", "HH-MM-ss")
]%%
<script type="text/javascript" runat="server">
    Platform.Load("Core", "1.1.5");

    responseJSON.statusCode = 400;
    responseJSON.statusMessage = 'no action';
    var timestamp = Variable.GetValue("@timestamp");
    var longTimestamp = Variable.GetValue("@longTimestamp");
    var shortTimestamp = Variable.GetValue("@shortTimestamp");
    responseJSON.timestamp = timestamp;

    var ipRows = Platform.Function.LookupRows('Valid IP Addresses',['valid'],['true']);
    var validIP = false;

    for (var i = 0; i < ipRows.length; i++) {
        if (ip.indexOf(ipRows[i].IP) > -1 ) {
            var validIP = true;
        }
    };
//try {
    // Access Control
    if ( validIP )  {     
        try {            
            timeJSON.authStart = new Date().getTime();

            /* Authentication */
            var baseURI = Platform.Function.Lookup('ENT.cxConfig','parameterValue','parameterName','newsletterAppBaseUri');
            var restURL = 'https://' + baseURI + '.rest.marketingcloudapis.com';
            var accessToken;
            var authJSON = {};
            
            // Get current Date and add 30 seconds for delays etc.
            var date = Now();
            var currentDate = new Date(date.getTime() + 1000 * 30);

            // Search valid token in DE
            var tokenDE = DataExtension.Init("ENT.NewsletterAPIToken");
            var tokenFilter = {Property:'expiringDate',SimpleOperator:'greaterThan', Value: currentDate};
            var tokenRows = tokenDE.Rows.Retrieve(tokenFilter);

            // Use saved token
            if (tokenRows.length >= 100) {
                accessToken = tokenRows[0].token;
            } 
            // Get new token and save
            else {
              
                var clientId = Platform.Function.Lookup('ENT.cxConfig','parameterValue','parameterName','newsletterAppClientId');
                var clientSecret = Platform.Function.Lookup('ENT.cxConfig','parameterValue','parameterName','newsletterAppClientSecret');
                var nlMID = Platform.Function.Lookup('ENT.NewsletterTypes','MID','Id',newsletterPermission);
                var authURL = 'https://' + baseURI + '.auth.marketingcloudapis.com/v2/token';
                var contentType = 'application/json';
                var payload = '{"grant_type": "client_credentials", "client_id": "' + clientId + '", "client_secret": "' + clientSecret +  '", "account_id": "' + nlMID +  '"}';

                var accessTokenResult = HTTP.Post(authURL, contentType, payload);
                var accessTokenResponse = Platform.Function.ParseJSON(accessTokenResult.Response[0]);
                accessToken = accessTokenResponse.access_token;
                var expiresIn = accessTokenResponse.expires_in;
                var scope = accessTokenResponse.scope;
                var expiringDate = new Date(currentDate.getTime() + 1000 * expiresIn);
                
                tokenDE.Rows.Add({token:accessToken,ExpiringDate:expiringDate,scope:scope});

            }

            timeJSON.authEnd = new Date().getTime();

            if (accessToken !== 'undefined' && accessToken != '') {

                responseJSON.auth = true;

                var nlRows = Platform.Function.LookupRows('ENT.NewsletterTypes','Id',newsletterPermission);
                responseJSON.nlRows = nlRows;
                var nlActive = nlRows[0].status;
                if (nlRows && nlRows.length > 0 && (nlActive == 'active' || dev )) {
                    
                    // Retrieve Newsletter Information
                    var nlSubject = dev == false ? nlBetreff : "DEV_" + nlBetreff;
                    var nlPreHeader = nlPreHeader;
                    var emailName = newsletterLogName + '_' + shortTimestamp;
                    var nlMID = nlRows[0].MID;
                    var nlSenderProfile = nlRows[0].senderProfile;
                    var nlDeliveryProfile = nlRows[0].deliveryProfile;
                    var nlSendClassification = nlRows[0].sendClassification;
                    var dynamicJourneyName = nlRows[0].journeyName;
                    var deNameEil = nlRows[0].deNameEil;   

                    responseJSON.nlSubject = nlSubject;
                    responseJSON.nlPreHeader = nlPreHeader;
                    responseJSON.emailName = emailName;
                    //responseJSON.emailNameEilmeldung = emailNameEilmeldung;
                    responseJSON.nlMID = nlMID;
                    var journeyResponse = {};
                    
                    responseJSON.subject = nlSubject;
                    responseJSON.preHeader = nlPreHeader;

                    //Gibt Anzahl der Subscriber der permissions-DE zurück -> Automation befüllt subscriberCount
                    var subscriberCount = Platform.Function.Lookup("NewsletterSubscriberCount", "subscriberCount", "permissionType", newsletterPermission);
                    responseJSON.subscriberCount = subscriberCount;
                    
                    if (mode == 'preview') {   
                        if (nlType) {

                            // Retrieve Template Content
                            var emailResponse = {};
                            
                            // Sonderfall für zwei Permission Types
                            if (newsletterPermission == "EM_FAKE_MITTAG" || newsletterPermission == "EM_FAKE_ABEND") {
                                var templateAssetId = "811095";
                            } else {
                                var templateAssetId = dev == false ? '459189' : '314608';
                            }
                            //var templateAssetId = dev == false ? '459189' : '314608';

                            var permissionType = newsletterPermission;
                            //var permissionType = "EM_RN_DO";
                            var brand = Platform.Function.Lookup("ENT.NewsletterTypes","brand", "Id", permissionType); //tbd from Master Data
                            //var brand = "RN";
                            var marketingAction = Platform.Function.Lookup("ENT.NewsletterTypes","marketingAction", "Id", permissionType);
                            var folderId = Platform.Function.Lookup("ENT.NewsletterTypes","folderId", "Id", permissionType);

                            emailResponse.brand = brand;
                            emailResponse.newsletterPermission = newsletterPermission;
                            emailResponse.marketingAction = marketingAction;
                            emailResponse.folderId = folderId;
                            
                            var templateURL = restURL + '/asset/v1/content/assets/' + templateAssetId;
                            //Write(templateURL);
                            var templateResp = sendRequest('GET', templateURL);
                            var templateRespJSON = Platform.Function.ParseJSON(String(templateResp.content));
                            var templateHTML = templateRespJSON.content;

                            timeJSON.createEmailStart = new Date().getTime();

                            /* Create Email */  
                            emailResponse.emailName = emailName;        
                            var emailURL = restURL + '/asset/v1/content/assets';
                            emailResponse.emailURL = emailURL;
                            var emailPayload = {
                                name: emailName, 
                                channels: { 
                                    email: true, 
                                    web: false 
                                },
                                category: {
                                    //id: '126644' 
                                    id: folderId
                                },
                                meta: {

                                    },
                                views: { 
                                    html: {
                                        thumbnail: {},
                                        content: templateHTML,

                                            availableViews: [],
                                            slots: {
                                                nlcontent: {
                                                    content: "",
                                                    blocks: {},
                                                    data: {
                                                        email: {
                                                            options: {
                                                                generateFrom: ""
                                                            }
                                                        }
                                                    },
                                                    modelVersion: 2
                                                }
                                            },
                                            template: {
                                                id: templateAssetId,
                                                assetType: {
                                                    id: 4,
                                                    name: "template"
                                                },
                                                name: "TemplateV1",
                                                content: "",
                                                meta: {
                                                    
                                                },
                                                availableViews: [],
                                                slots: {
                                                    nlcontent: {
                                                        locked: false,
                                                        availableViews: [],
                                                        data: {
                                                            email: {
                                                                options: {
                                                                    generateFrom: ""
                                                                }
                                                            }
                                                        },
                                                        modelVersion: 2
                                                    }
                                                },
                                                data: {
                                                    email: {
                                                        options: {
                                                            generateFrom: ""
                                                        }
                                                    }
                                                },
                                                modelVersion: 2
                                            },
                                            data: {
                                                email: {
                                                    options: {
                                                        generateFrom: ""
                                                    }
                                                }
                                            },
                                            modelVersion: 2
                                        },
                                    text: {},
                                    subjectline: {
                                        contentType: "application/vnd.etmc.email.View; kind=subjectline",
                                        thumbnail: {},
                                        content: nlSubject,
                                        meta: {},
                                        availableViews: [],
                                        data: {
                                            email: {
                                                options: {
                                                    generateFrom: ""
                                                }
                                            }
                                        },
                                        modelVersion: 2
                                    },                        
                                    preheader: {
                                        contentType: "application/vnd.etmc.email.View; kind=preheader",
                                        thumbnail: {},
                                        content: nlPreHeader,
                                        meta: {},
                                        availableViews: [],
                                        data: {
                                            email: {
                                                options: {
                                                    generateFrom: ""
                                                }
                                            }
                                        },
                                        modelVersion: 2
                                    } 
                                },
                                assetType: {
                                    name: "templatebasedemail", 
                                    id: 207
                                },
                                data: {
                                    email: {
                                        options: {
                                            characterEncoding: 'utf-8'
                                        },
                                        attributes: [
                                            {
                                                displayName: "brand",
                                                name: "__AdditionalEmailAttribute1",
                                                value: brand,
                                                order: 1,
                                                channel: "email",
                                                attributeType: "AdditionalEmailAttribute"
                                            },
                                            {
                                                displayName: "marketingAction",
                                                name: "__AdditionalEmailAttribute2",
                                                value: marketingAction,
                                                order: 1,
                                                channel: "email",
                                                attributeType: "AdditionalEmailAttribute"
                                            },
                                            {
                                                displayName: "permissionType",
                                                name: "__AdditionalEmailAttribute3",
                                                value: newsletterPermission,
                                                order: 1,
                                                channel: "email",
                                                attributeType: "AdditionalEmailAttribute"
                                            }
                                        ]
                                    }
                                }
                            }
                            
                            // Define Asset Types
                            var assetTypeHTML = {
                                    id: 197,
                                    name: "htmlblock"
                            };

                            var assetTypeText = {
                                    id: 196,
                                    name: "textblock"
                            };

                            var assetTypeLayout = {
                                    id: 213,
                                    name: "layoutblock"
                            };

                            var assetTypeFreeForm = {
                                    id: 195,
                                    name: "freeformblock"
                            };

                            var assetTypeImage = {
                                    id: 199,
                                    name: "imageblock"
                            };

                            var assetTypeCode = {
                                    id: 220,
                                    name: "codesnippetblock"
                            };

                            var assetTypeReferenceBlock = {
                                    id: 223,
                                    name: "referenceblock"
                            };
                            

                            //START EILMELDUNG
                            if (nlStructure == "eilmeldung") {

                                var heroImage = Platform.Function.Lookup('emailContentSets','elementValue',['businessUnit','brand','elementName'],[nlMID,newsletterPermission,'heroImageEilmeldung']);

                                var replacemenHeroImage = {
                                        replacements: [
                                            {
                                                name: 'HEROIMAGE',
                                                value: heroImage
                                            }
                                        ]
                                    };
                                
                                createContentBlock('heroimage', 'NLAPP_heroImageEM', assetTypeFreeForm, replacemenHeroImage, 'nlcontent');
                               
                                var articlesJSON = json.articlesJSON;
                                responseJSON.articlesJSON = articlesJSON;
                                var dropzones = articlesJSON.dropzones;
                                responseJSON.dropzonesLen = dropzones.length;
                                var allItems = [];
                                var debug1 = {};
                                debug1.status = "Test";
                            
                                // Iterate over each dropzone
                                for (var i = 0; i < dropzones.length; i++) {
                                
                                    var dropzone = dropzones[i];
                                    var items = dropzone.items;
                                    responseJSON['dropzone_' + (i + 1) + '_itemsLen'] = items.length;

                                    var countArticles = articlesJSON.dropzones[i].items.length;
                                    if (countArticles > 0) {
                                        
                                        for (var j = 0; j < countArticles; j++) {
                                            
                                            var itemId = articlesJSON.dropzones[i].items[j].itemId;
                                            var zeitungUrl = Platform.Function.Lookup("NewsletterTypes","zeitungUrl","Id",newsletterPermission);
                                            //var zeitungUrl = "ruhrnachrichten";

                                            var requestJSON = HTTP.Get('https://www.' + zeitungUrl + '.de/wp-json/wp/v2/posts/' + itemId);

                                            var articleJSON = Platform.Function.ParseJSON(String(requestJSON.Content));

                                            var articleImage = articleJSON.yoast_head_json.og_image[0].url;
                                            var articleTitle1 = articleJSON.rumble_app_meta.title1;
                                            var articleTitle2 = articleJSON.rumble_app_meta.title2;
                                            var articleExcerpt = articleJSON.excerpt.rendered;
                                            var articleLink = articleJSON.link;
                                            //var paidcontent = articleJSON.rumble_app_meta.paidcontent;
                                            //var articleContent = articleJSON.content.rendered;
                                            //articleContent = articleContent.slice(0, 500);
                                            
                                            // Für die Eilmeldung GIF als HeroImage
                                            var replacemenTestImage = {
                                                replacements: [
                                                    {
                                                        name: 'ARTICLEIMAGE',
                                                        value: articleImage
                                                    },
                                                    {
                                                        name: 'ARTICLELINK',
                                                        value: articleLink         
                                                    }
                                                ]
                                            };
                                            createContentBlock('image' +j+i, 'NLAPP_articleImage', assetTypeFreeForm, replacemenTestImage, 'nlcontent');
                                           
                                            var replacemenTestHeadline = {
                                                replacements: [
                                                    {
                                                        name: 'ARTICLETITLE',
                                                        value: articleTitle1
                                                    },
                                                    {
                                                        name: 'ARTICLETEASER',
                                                        value: articleTitle2
                                                    },
                                                    {
                                                        name: 'ARTICLELINK',
                                                        value: articleLink         
                                                    }                                   ]
                                            };
                                            createContentBlock('headline'+j+i, 'NLAPP_articleHeadline', assetTypeFreeForm, replacemenTestHeadline, 'nlcontent');
                                                        
                                            var replacemenTestText = {
                                                replacements: [
                                                    {
                                                        name: 'ARTICLETEXT',
                                                        value: articleExcerpt
                                                    },
                                                    {
                                                        name: 'ARTICLELINK',
                                                        value: articleLink         
                                                    } 
                                                ]
                                            };
                                            createContentBlock('text'+j+i, 'NLAPP_articleTextContent', assetTypeFreeForm, replacemenTestText, 'nlcontent');
                                            
                                            var replacementReadmore= {
                                                replacements: [
                                                    {
                                                        name: 'ARTICLELINK',
                                                        value: articleLink         
                                                    } 
                                                ]
                                            };
                                            createContentBlock('readmorelink'+j+i, 'NLAPP_articleMoreLink', assetTypeFreeForm, replacementReadmore, 'nlcontent');
                                            createContentBlock('spacerarticle1', 'NLAPP_separator8outerBGColor', assetTypeFreeForm, replacementOuterBGColor, 'nlcontent');
                                        }
                                         
                                    }
                                    //responseJSON['dropzone_' + (i + 1) + '_itemId_' + (j + 1)] = itemId;
                                }
                                
                                var nlidpart1 = new Date().getTime();
                                //var nlidpart2 = "RandomNumber"
                                var UNLId = nlidpart1;
                                //var UNLId = nlidpart1 + nlidpart2;
                                //var UNLId = "222";
                                
                                var codeplacementftaf = '%' + '%[ set @UNLId = ' + UNLId + ']%' + '%';
                                //var codeplacementftaf = "321";
                                var replacementFTAFCode =  {
                                    replacements: [
                                        {
                                            name: 'CODEREPLACEMENTFTAF',
                                            value: codeplacementftaf  
                                        }
                                    ]
                                };
                                
                                createContentBlock('forwardtoafriendcode', 'footerFTAFCode', assetTypeCode, replacementFTAFCode, 'nlcontent');
                                createContentBlock('forwardtoafriend', 'footerFTAFHtml', assetTypeReferenceBlock, {}, 'nlcontent'); 
                                
                                //END EILMELDUNG
                            } else if (nlStructure != "eilmeldung" && permissionType == "EM_FAKE_MITTAG") {
                                
                                //START NEWSLETTER FLAGGSCHIFF
                                var heroImage = Platform.Function.Lookup('emailContentSets', 'elementValue', ['businessUnit', 'brand', 'elementName'], [nlMID, newsletterPermission, 'heroImage']);
                                var AutorEmail = json.AutorEmail;                
                                var heroImageTheme = Platform.Function.Lookup('ENT.NewsletterAutoren', 'heroImage', ['MID', 'nlPermission', 'email'], [nlMID, newsletterPermission, AutorEmail]);

                                if (heroImageTheme && heroImageTheme != '0') {
                                    
                                    replacementHeroImage = {
                                        replacements: [
                                            {
                                                name: 'HEROIMAGE',
                                                value: heroImageTheme
                                            }
                                        ]
                                    };
                                    createContentBlock('heroimageautor', 'NLAPP_heroImage', assetTypeFreeForm, replacementHeroImage, 'nlcontent');
                                } else {

                                    replacementHeroImage = {
                                        replacements: [
                                            {
                                                name: 'HEROIMAGE',
                                                value: heroImage
                                            }
                                        ]
                                    };
                                    createContentBlock('heroimage', 'NLAPP_heroImage', assetTypeFreeForm, replacementHeroImage, 'nlcontent');
                                }

                                 /* 
                                AUTOR
                                */
                                var AutorEmail = json.AutorEmail;

                                var AutorName = Platform.Function.Lookup("NewsletterAutoren","Autor","email",AutorEmail);
                                var AutorPosition = Platform.Function.Lookup("NewsletterAutoren","position","email",AutorEmail);
                                var autorImageURL = Platform.Function.Lookup("NewsletterAutoren","autorImageURL",["email","nlPermission"],[AutorEmail,newsletterPermission]);
                                /*
                                var mainLinkColor = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainLinkColor']);
                                */
                                var introText = json.introText;
                                //introText = introText.replace("&quot;", ""); 
                                introText = introText.replace(/&quot;/g, '"');
                                // Fixing Links
                                introText = introText.replace(/<a/g, '<a style="line-height: 26px; text-decoration: none; color:' + mainLinkColor + ';"');
                                //introText = "'" + introText + "'";
                                /*var fallbackIntroText = Platform.Function.Lookup("NewsletterTypes", "fallbackIntroText","Id", permissionType);
                                */
                                var blankIntro = true;

                                if (introText.length < 50) {
                                    introText = fallbackIntroText;
                                }

                                if (introText.length > 50) {
                                    blankIntro = false;
                                }

                                if ( AutorEmail.length > 0 && AutorName.length > 0 ) {
                                    var replacementAutor = {
                                        replacements: [
                                            {
                                                name: 'AUTORNAME',
                                                value:  AutorName
                                            },
                                            {
                                                name: 'AUTORPOSITION',
                                                value:  AutorPosition
                                            },
                                            {
                                                name: 'AUTORIMAGEURL',
                                                value:  autorImageURL
                                            }
                                        ]
                                    };
                                    //if (blankIntro == false) {
                                    //createContentBlock('introauthor', 'NLAPP_introAuthor', assetTypeFreeForm, replacementAutor, 'nlcontent');
                                    //createContentBlock('introauthor', 'Flaggschiff_Host_Bild_Einzeln', assetTypeFreeForm, replacementAutor, 'nlcontent');
                                    createContentBlock('introauthorBild', 'Flaggschiff_Host_Bild_Einzeln', assetTypeFreeForm, {}, 'nlcontent');
                                    //createContentBlock('introauthor', 'Flaggschiff_Host_Name', assetTypeFreeForm, {}, 'nlcontent');
                                    //createContentBlock('introauthor', 'Flaggschiff_Verabschiedung_Host', assetTypeFreeForm, {}, 'nlcontent');
                                    //}
                                    var replacementOuterBGColor =  {
                                                replacements: [
                                                    {
                                                        name: 'TEMPLATEBACKGROUNDCOLOR',
                                                        value: '%%' + '=v(@templateBackgroundColor)=' + '%%'   
                                                    }
                                                ]
                                            };
                                    //if (blankIntro == false) {
                                    //createContentBlock('spacerintro1', 'NLAPP_separator8outerBGColor', assetTypeFreeForm, replacementOuterBGColor, 'nlcontent');
                                    //}
                                }

                                /* SALUTATION */
                                //var dynSalutation = Platform.Function.Lookup("ENT.NewsletterTypes","dynamicSalutation","Id",newsletterPermission);

                                var replacementSalutation = {
                                        replacements: [
                                            {
                                                name: 'DYNSALUTATION',
                                                value:  salutation
                                            }
                                        ]
                                    }; 
                                //var dynSalutation = Platform.Function.Lookup('ENT.emailContentSets','elementValue',['businessUnit','brand','elementName'],[nlMID,newsletterPermission,'heroImage']);
                                            
                                //createContentBlock('introSalutationSnippet', dynSalutation, assetTypeFreeForm, '', 'nlcontent');
                                //if (blankIntro == false) {
                                //createContentBlock('introsalutationsnippet', dynSalutation, assetTypeReferenceBlock, {}, 'nlcontent');
                                //}
                                //createContentBlock('introSalutation', 'NLAPP_introSalutation', assetTypeFreeForm, "", 'nlcontent');


                                
                                

                                /* HEADLINE */
                                /*var introTextHeadline = json.introTextHeadline;
                                var replacementIntroTextHeadline = {
                                        replacements: [
                                            {
                                                name: 'INTROTEXTHEADLINE',
                                                value: introTextHeadline
                                            }
                                        ]
                                    };
                                if (blankIntro == false) {
                                    createContentBlock('introtextheadline', 'NLAPP_introTextHeadline', assetTypeFreeForm, replacementIntroTextHeadline, 'nlcontent');
                                }    */
                                
                                
                                
                            
                                var replacementIntroText = {
                                        replacements: [
                                            {
                                                name: 'INTROTEXT',
                                                value:  introText
                                            },
                                            {
                                                name: 'AUTORNAME',
                                                value:  AutorName
                                            }
                                        ]
                                    };
                                //if (blankIntro == false) {
                                //createContentBlock('introtext', 'NLAPP_introText', assetTypeFreeForm, replacementIntroText, 'nlcontent');
                                createContentBlock('introtext', 'Flaggschiff_Intro_Textblock', assetTypeFreeForm, replacementIntroText, 'nlcontent');
                                createContentBlock('introtextVerabschiedung', 'Flaggschiff_Verabschiedung_Host', assetTypeFreeForm, replacementIntroText, 'nlcontent');
                                
                                //}
                                

                               
                            
                                var articlesJSON = json.articlesJSON;
                                responseJSON.articlesJSON = articlesJSON;
                                var dropzones = articlesJSON.dropzones;
                                responseJSON.dropzonesLen = dropzones.length;
                                var allItems = [];
                                var debug1 = {};
                                debug1.status = "Test";
                            
                                // Iterate over each dropzone
                                for (var i = 0; i < dropzones.length; i++) {
                                
                                    var dropzone = dropzones[i];
                                    var items = dropzone.items;
                                    responseJSON['dropzone_' + (i + 1) + '_itemsLen'] = items.length;

                                    //var itemIds = [];

                                
                                    var countArticles = articlesJSON.dropzones[i].items.length;
                                    if (countArticles > 0) {
                                        if (i == 0) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric1Title","Id",newsletterPermission);
                                        }
                                        if (i == 1) {
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric2Title","Id",newsletterPermission);
                                        }
                                        if (i == 2) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric3Title","Id",newsletterPermission);
                                        }
                                        if (i == 3) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric4Title","Id",newsletterPermission);
                                        }
                                        if (i == 4) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric5Title","Id",newsletterPermission);
                                        }
                                        if (i == 5) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric6Title","Id",newsletterPermission);
                                        }
                                        if (i == 6) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric7Title","Id",newsletterPermission);
                                        }
                                    
                                        //var mainTitleBackgroundColor2 = Platform.Function.Lookup('ENT.emailContentSets','elementValue',['businessUnit','brand','elementName'],[nlMID,brand,'mainTitleBackgroundColor']);
                                        var replacementRessort = {
                                            replacements: [
                                                {
                                                    name: 'TITEL',
                                                    value: rubricTitle
                                                },
                                                /*{
                                                    name: 'MAINTITLEBACKGROUNDCOLOR',
                                                    //value: mainTitleBackgroundColor2
                                                     value: '%%' + '=v(@mainTitleBackgroundColor)=' + '%%'  
                                                },*/
                                                {
                                                    name: 'MAINTITLEFONTCOLOR',
                                                    //value: mainTitleBackgroundColor2
                                                     value: '%%' + '=v(@mainTitleFontColor)=' + '%%'  
                                                }
                                            ]
                                        };
                                        //createContentBlock('rubrictitle' +i+1, 'NLAPP_rubricTitle', assetTypeFreeForm, replacementRessort, 'nlcontent');
                                        
                                        /* DYNAMISCHE RUBRIK BILDER - WOHER? NewsletterTypes???*/
                                        createContentBlock('rubrictitleImage' +i+1, 'Flaggschiff_Rubrikbild_TopThema', assetTypeFreeForm, replacementRessort, 'nlcontent');
                                        //createContentBlock('rubrictitle' +i+1, 'Flaggschiff_Rubrik_TopThema', assetTypeFreeForm, replacementRessort, 'nlcontent');
                                        /*createContentBlock('rubrictitle' +i+1, 'Flaggschiff_Rubrikbild_TopThema', assetTypeFreeForm, replacementRessort, 'nlcontent');
                                        createContentBlock('rubrictitle' +i+1, 'Flaggschiff_Rubrik_TopThema', assetTypeFreeForm, replacementRessort, 'nlcontent');*/
                                        //createContentBlock('spacer'+i, 'NLAPP_separator8innerBGColor', assetTypeFreeForm, '', 'nlcontent');
                                        //createContentBlock('spacer'+i+4, 'NLAPP_separator8innerBGColor', assetTypeFreeForm, '', 'nlcontent');
                                        //createContentBlock('spacer'+i+8, 'NLAPP_separator8innerBGColor', assetTypeFreeForm, '', 'nlcontent');
                    
                                        //} 
                                        //try {
                                            for (var j = 0; j < countArticles; j++) {
                                                //try {  
                                                    var itemId = articlesJSON.dropzones[i].items[j].itemId;
                                                    /* var zeitungName = json.zeitungName;
                                                    var zeitungURL = zeitungName.toLowerCase().replace(/\s+/g, '');
                                                    zeitungURL = zeitungURL.replace(/ü/g, 'ue'); // Replace 'ü' with 'ue'
                                                    zeitungURL = zeitungURL.replace(/ä/g, 'ae'); // Replace 'ä' with 'ae' */
                                                    var zeitungUrl = Platform.Function.Lookup("NewsletterTypes","zeitungUrl","Id",newsletterPermission);
                                                    //var zeitungUrl = "ruhrnachrichten";
                                                    /* if (!zeitungUrl) {
                                                        throw new Error('Failed to retrieve zeitungUrl from the NewsletterTypes Data Extension.');
                                                    } */

                                                    //var requestJSON = HTTP.Get('https://www.' + zeitungUrl + '.de/wp-json/wp/v2/posts/' + itemId);
                                                    /* if (requestJSON.statusCode != 200) {
                                                        //TRY CATCH, damit kein 500er kommt
                                                        // Response ausgeben

                                                    } */
                                                    

                                                    // NEUER BASIC AUTH WP-API-CALL
                                                    var requestUrl = 'https://www.' + zeitungUrl + '.de/wp-json/wp/v2/posts/' + itemId;
                                                    
                                                    var user = 'rumble-newsletter-app';
                                                    
                                                    //var password = 'NQt3 NgqP DdnU ik4L swGK sf5d';
                                                    var password = Platform.Function.Lookup("NewsletterTypes","wpapipw","Id",newsletterPermission);
                                                   
                                                    var auth = 'Basic ' + Platform.Function.Base64Encode(user + ':' + password);
                                                    var headerNames = ["Authorization", "contentType"];
                                                    var headerValues = [auth, "application/json"];
                                                    //var contentType = 'application/json';
                                                    //var header = 'Authorization: ' + auth;
                                                    

                                                    //var content = debug == "test" ? HTTP.Get(requestUrl, header)["Content"] : HTTP.Get(requestUrl)["Content"];
                                                    //var content = HTTP.Get(requestUrl, header)["Content"];
                                                    
                                                    var response = HTTP.Get(requestUrl, headerNames, headerValues);

                                                    /* if (!response || response.StatusCode != 200) {
                                                        throw new Error(`HTTP GET failed for URL: ${requestUrl}. Status Code: ${response ? response.StatusCode : 'No Response'}`);
                                                    } */

                                                

                                                    var articleJSON = Platform.Function.ParseJSON(String(response.Content));

                                                    /* if (!articleJSON) {
                                                        throw new Error(`Failed to parse JSON response for item ID: ${itemId}`);
                                                    }*/

                                                    var articleImage = articleJSON.yoast_head_json.og_image[0].url;
                                                    var articleTitle1 = articleJSON.rumble_app_meta.title1;
                                                    var articleTitle2 = articleJSON.rumble_app_meta.title2;
                                                    var articleExcerpt = articleJSON.excerpt.rendered;
                                                    var articleLink = articleJSON.link;
                                                    var paidcontent = articleJSON.rumble_app_meta.paidcontent;
                                                    //var premiumIcon = '<img alt="RN+" height="17" src="PREMIUMICONSOURCE" style="text-align: center; height: 17px; width: 32px; margin: 0; border: 0;" width="32">';
                                                    //var articleContent = articleJSON.content.rendered;
                                                    //articleContent = articleContent.slice(0, 500);

                                                    var replacemenTestImage = {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLEIMAGE',
                                                                value: articleImage
                                                            },
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            }
                                                        ]
                                                    };
                                                    createContentBlock('image' +j+i, 'NLAPP_articleImageFlag', assetTypeFreeForm, replacemenTestImage, 'nlcontent');

                                                    if (paidcontent) {
                                                        
                                                        var replacemenTestHeadline = {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLETITLE',
                                                                value: articleTitle1
                                                            },
                                                            {
                                                                name: 'ARTICLETEASER',
                                                                value: articleTitle2
                                                            },
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            }                                 
                                                        ]
                                                    };

                                                    createContentBlock('headline'+j+i, 'NLAPP_articleHeadlinePlusFlag', assetTypeFreeForm, replacemenTestHeadline, 'nlcontent');
                                                    
                                                    } else {
                                                        var replacemenTestHeadline = {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLETITLE',
                                                                value: articleTitle1
                                                            },
                                                            {
                                                                name: 'ARTICLETEASER',
                                                                value: articleTitle2
                                                            },
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            }                                   
                                                        ]
                                                    };
                                                    
                                                    createContentBlock('headline'+j+i, 'NLAPP_articleHeadlineFlag', assetTypeFreeForm, replacemenTestHeadline, 'nlcontent');
                                                    
                                                    }

                                                    var replacemenTestText = {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLETEXT',
                                                                value: articleExcerpt
                                                            },
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            } 
                                                        ]
                                                    };
                                                    createContentBlock('text'+j+i, 'NLAPP_articleTextContentFlag', assetTypeFreeForm, replacemenTestText, 'nlcontent');
                                                    
                                                    var replacementReadmore= {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            } 
                                                        ]
                                                    };
                                                    createContentBlock('readmorelink'+j+i, 'NLAPP_articleMoreLinkFlag', assetTypeFreeForm, replacementReadmore, 'nlcontent');

                                                /* } catch (articleError) {
                                                Write(`<p>Error processing article with itemId: ${itemId}</p>`);
                                                Write(`<p>Error Message: ${articleError.message}</p>`);
                                                } */
                                            
                                                //AD POSITIONEN UND FALLBACKS
                                                var fallbackb1 = false;
                                                var fallbackb2 = true;
                                                var fallbackc1 = true;
                                            
                                                /* if (i == 0 && j == 0 ){
                                                    fallbackb1 = false;
                                                } */
                                                if (i == 0 && j >= 2){                                                
                                                    fallbackc1 = false;
                                                }
                                                if (i == 0 && j >= 1){
                                                    fallbackb2 = false;
                                                }
                                                
                                                var codeplacementc1 = '%' + '%[ SET @now = Now() set @localDate =  SystemDateToLocalDate(@now) SET @day = FormatDate(@localDate, "DD") SET @month = FormatDate(@localDate, "MM") SET @year = FormatDate(@localDate, "YYYY") SET @formattedDate = Concat(@day, "-", @month, "-", @year) SET @adJSONC1 = Lookup("ENT.NewsletterAds", "adJSON", "permissionType", @permissionType, "adTyp", "c1", "requestDate", @formattedDate) IF NOT EMPTY(@adJSONC1) THEN SET @adImageC1 = RegExMatch(@adJSONC1, \'"image_url"\\s*:\\s*"([^"]+)"\', 1) SET @adLinkC1 = RegExMatch(@adJSONC1, \'"ad_url"\\s*:\\s*"([^"]+)"\', 1) SET @adTitle1C1 = RegExMatch(@adJSONC1, \'"titel1"\\s*:\\s*"([^"]+)"\', 1) SET @adTitle2C1 = RegExMatch(@adJSONC1, \'"titel2"\\s*:\\s*"([^"]+)"\', 1) SET @adBodyC1 = RegExMatch(@adJSONC1, \'"body"\\s*:\\s*"([^"]+)"\', 1) ENDIF IF NOT EMPTY (@adJSONC1) AND @adJSONC1 != "default" THEN SET @hasC1 = true ELSE SET @hasC1 = false ENDIF ]%' + '%';
                                                var codeplacementb1 = '%' + '%[ SET @now = Now() set @localDate =  SystemDateToLocalDate(@now) SET @day = FormatDate(@localDate, "DD") SET @month = FormatDate(@localDate, "MM") SET @year = FormatDate(@localDate, "YYYY") SET @formattedDate = Concat(@day, "-", @month, "-", @year) SET @adJSONB1 = Lookup("ENT.NewsletterAds", "adJSON", "permissionType",@permissionType, "adTyp", "b1", "requestDate", @formattedDate) IF NOT EMPTY(@adJSONB1) THEN SET @adImageB1 = RegExMatch(@adJSONB1, \'"image_url"\\s*:\\s*"([^"]+)"\', 1) SET @adLinkB1 = RegExMatch(@adJSONB1, \'"ad_url"\\s*:\\s*"([^"]+)"\', 1) ENDIF IF NOT EMPTY (@adJSONB1) AND @adJSONB1 != "default" THEN SET @hasB1 = true ELSE SET @hasB1 = false ENDIF]%' + '%';
                                                var codeplacementb2 = '%' + '%[ SET @now = Now() set @localDate =  SystemDateToLocalDate(@now) SET @day = FormatDate(@localDate, "DD") SET @month = FormatDate(@localDate, "MM") SET @year = FormatDate(@localDate, "YYYY") SET @formattedDate = Concat(@day, "-", @month, "-", @year) SET @adJSONB2 = Lookup("ENT.NewsletterAds", "adJSON", "permissionType", @permissionType, "adTyp", "b2", "requestDate", @formattedDate) IF NOT EMPTY(@adJSONB2) THEN SET @adImageB2 = RegExMatch(@adJSONB2, \'"image_url"\\s*:\\s*"([^"]+)"\', 1) SET @adLinkB2 = RegExMatch(@adJSONB2, \'"ad_url"\\s*:\\s*"([^"]+)"\', 1) ENDIF IF NOT EMPTY (@adJSONB2) AND @adJSONB2 != "default" THEN SET @hasB2 = true ELSE SET @hasB2 = false ENDIF]%' + '%';

                                                var replacementAdb1= {
                                                    replacements: [
                                                        {
                                                            name: 'CODEPLACEMENT',
                                                            value: codeplacementb1
                                                        }
                                                    ]
                                                };

                                                var replacementAdb2= {
                                                    replacements: [
                                                        {
                                                            name: 'CODEPLACEMENT',
                                                            value: codeplacementb2
                                                        }
                                                    ]
                                                };

                                                var replacementAdc1= {
                                                    replacements: [
                                                        {
                                                            name: 'CODEPLACEMENT',
                                                            value: codeplacementc1
                                                        }
                                                    ]
                                                };


                                                //AD POSI B1
                                                if (i == 0 && j == 0 && fallbackb1 == false)
                                                {
                                                    createContentBlock('test1', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdb1, 'nlcontent');
                                                    createContentBlock('test2', 'NLAPP_adb1', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                                //FALL BACK B1
                                                /* if (i == 0 && j == (countArticles-1) && fallbackb1 == true)  
                                                {
                                                    createContentBlock('test3', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdb1, 'nlcontent');
                                                    createContentBlock('test4', 'NLAPP_adb1', assetTypeReferenceBlock, {}, 'nlcontent');
                                                } */
                                                //AD POSI C1
                                                if (i == 0 && j == 2 && fallbackc1 == false) {
                                                    //HIER CONTENT AD  C1
                                                    createContentBlock('adc1logic', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdc1, 'nlcontent');
                                                    createContentBlock('adc1', 'NLAPP_adc1', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                                //FALLBACK C1
                                                if (i == 0 && j == (countArticles-1) && fallbackc1 == true)
                                                {
                                                    createContentBlock('adc1logic', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdc1, 'nlcontent');
                                                    createContentBlock('adc1fb', 'NLAPP_adc1', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                                // AD POSI B2
                                                if (i == 0 && j == (countArticles-1) && fallbackb2 == false) {
                                                    createContentBlock('adb2logic', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdb2, 'nlcontent');
                                                    createContentBlock('adb2', 'NLAPP_adb2', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                                //FALLBACK B2
                                                if (i == 0 && j == (countArticles-1) && fallbackb2 == true) {
                                                    createContentBlock('adb2logic', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdb2, 'nlcontent');
                                                    createContentBlock('adb2', 'NLAPP_adb2', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                            }
                                        /* } catch (generalError) {
                                            Write(`<p>An error occurred while processing the articles:</p>`);
                                            Write(`<p>Error Message: ${generalError.message}</p>`);
                                        } */
                                    }
                                    //responseJSON['dropzone_' + (i + 1) + '_itemId_' + (j + 1)] = itemId;
                                }


                                /*var replacementOuterBGColor =  {
                                                replacements: [
                                                    {
                                                        name: 'TEMPLATEBACKGROUNDCOLOR',
                                                        value: '%%' + '=v(@templateBackgroundColor)=' + '%%'   
                                                    }
                                                ]
                                            };
                                createContentBlock('spacerX', 'NLAPP_separator8outerBGColor', assetTypeFreeForm, replacementOuterBGColor, 'nlcontent');*/
                                //createContentBlock('spacerAd1', 'NLAPP_separator8outerBGColor', assetTypeFreeForm, '', 'nlcontent');
                                //createContentBlock('spacerX', 'NLAPP_separator8outerBGColor', assetTypeFreeForm, '', 'nlcontent');
                                
                                var nlidpart1 = new Date().getTime();
                                //var nlidpart2 = "RandomNumber"
                                var UNLId = nlidpart1;
                                //var UNLId = nlidpart1 + nlidpart2;
                                //var UNLId = "222";
                                
                                var codeplacementftaf = '%' + '%[ set @UNLId = ' + UNLId + ']%' + '%';
                                //var codeplacementftaf = "321";
                                /*var replacementFTAFCode =  {
                                    replacements: [
                                        {
                                            name: 'CODEREPLACEMENTFTAF',
                                            value: codeplacementftaf  
                                        }
                                    ]
                                };*/

                                //createContentBlock('forwardtoafriendcode', 'footerFTAFCode', assetTypeCode, replacementFTAFCode, 'nlcontent');
                                //createContentBlock('forwardtoafriend', 'footerFTAFHtml', assetTypeReferenceBlock, {}, 'nlcontent'); 
                                
                                createContentBlock('crcb1', 'crcbhtml1', assetTypeReferenceBlock, {}, 'nlcontent');
                                createContentBlock('crcb2', 'crcbhtml2', assetTypeReferenceBlock, {}, 'nlcontent');
                                createContentBlock('crcb3', 'crcbhtml3', assetTypeReferenceBlock, {}, 'nlcontent');

                                createContentBlock('rubrikSpiele', 'Flaggschiff_Rubrik_Spiele', assetTypeReferenceBlock, {}, 'nlcontent');
                                createContentBlock('rubrikPreFooter', 'Flaggschiff_Footercontent', assetTypeReferenceBlock, {}, 'nlcontent');
                                createContentBlock('rubrikBewertung', 'Flaggschiff_Bewertung', assetTypeReferenceBlock, {}, 'nlcontent');
                                createContentBlock('abschlussMotiv', 'Flaggschiff_Abschluss-Motiv', assetTypeReferenceBlock, {}, 'nlcontent'); 
                            }
                            else {
                                //HINWEIS ZWANGSNEWSLETTER
                                /*var replacementZwangsNL =  {
                                                replacements: [
                                                    {
                                                        name: 'CODEREPLACEMENTZWANGSNL',
                                                        value: '%%' + '=ContentBlockByKey("hinweisZwangsnewsletter")=' + '%%'   
                                                    }
                                                ]
                                            };
                                   
                                createContentBlock('zwangsNLBlock', 'hinweisZwangsnewsletterRNC', assetTypeFreeForm, replacementZwangsNL, 'nlcontent');
                                    */
                                //START NEWSLETTER NORMAL
                                var heroImage = Platform.Function.Lookup('emailContentSets', 'elementValue', ['businessUnit', 'brand', 'elementName'], [nlMID, newsletterPermission, 'heroImage']);
                                var AutorEmail = json.AutorEmail;                
                                var heroImageTheme = Platform.Function.Lookup('ENT.NewsletterAutoren', 'heroImage', ['MID', 'nlPermission', 'email'], [nlMID, newsletterPermission, AutorEmail]);

                                if (heroImageTheme && heroImageTheme != '0') {
                                    
                                    replacementHeroImage = {
                                        replacements: [
                                            {
                                                name: 'HEROIMAGE',
                                                value: heroImageTheme
                                            }
                                        ]
                                    };
                                    createContentBlock('heroimageautor', 'NLAPP_heroImage', assetTypeFreeForm, replacementHeroImage, 'nlcontent');
                                } else {

                                    replacementHeroImage = {
                                        replacements: [
                                            {
                                                name: 'HEROIMAGE',
                                                value: heroImage
                                            }
                                        ]
                                    };
                                    createContentBlock('heroimage', 'NLAPP_heroImage', assetTypeFreeForm, replacementHeroImage, 'nlcontent');
                                }

                                
                                var mainLinkColor = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainLinkColor']);
                                var introText = json.introText;
                                //introText = introText.replace("&quot;", ""); 
                                introText = introText.replace(/&quot;/g, '"');
                                // Fixing Links
                                introText = introText.replace(/<a/g, '<a style="line-height: 26px; text-decoration: none; color:' + mainLinkColor + ';"');
                                //introText = "'" + introText + "'";
                                var fallbackIntroText = Platform.Function.Lookup("NewsletterTypes", "fallbackIntroText","Id", permissionType);

                                var blankIntro = true;

                                if (introText.length < 50) {
                                    introText = fallbackIntroText;
                                }

                                if (introText.length > 50) {
                                    blankIntro = false;
                                }

                                /* HEADLINE */
                                var introTextHeadline = json.introTextHeadline;
                                var replacementIntroTextHeadline = {
                                        replacements: [
                                            {
                                                name: 'INTROTEXTHEADLINE',
                                                value: introTextHeadline
                                            }
                                        ]
                                    };
                                if (blankIntro == false) {
                                    createContentBlock('introtextheadline', 'NLAPP_introTextHeadline', assetTypeFreeForm, replacementIntroTextHeadline, 'nlcontent');
                                }    
                                
                                /* SALUTATION */
                                var dynSalutation = Platform.Function.Lookup("ENT.NewsletterTypes","dynamicSalutation","Id",newsletterPermission);

                                /*var replacementSalutation = {
                                        replacements: [
                                            {
                                                name: 'DYNSALUTATION',
                                                value:  salutation
                                            }
                                        ]
                                    };  */
                                //var dynSalutation = Platform.Function.Lookup('ENT.emailContentSets','elementValue',['businessUnit','brand','elementName'],[nlMID,newsletterPermission,'heroImage']);
                                            
                                //createContentBlock('introSalutationSnippet', dynSalutation, assetTypeFreeForm, '', 'nlcontent');
                                if (blankIntro == false) {
                                createContentBlock('introsalutationsnippet', dynSalutation, assetTypeReferenceBlock, {}, 'nlcontent');
                                }
                                //createContentBlock('introSalutation', 'NLAPP_introSalutation', assetTypeFreeForm, "", 'nlcontent');

                                
                            
                                var replacementIntroText = {
                                        replacements: [
                                            {
                                                name: 'INTROTEXT',
                                                value:  introText
                                            }
                                        ]
                                    };
                                if (blankIntro == false) {
                                createContentBlock('introtext', 'NLAPP_introText', assetTypeFreeForm, replacementIntroText, 'nlcontent');
                                }

                                /* 
                                AUTOR
                                */
                                var AutorEmail = json.AutorEmail;

                                var AutorName = Platform.Function.Lookup("NewsletterAutoren","Autor","email",AutorEmail);
                                var AutorPosition = Platform.Function.Lookup("NewsletterAutoren","position","email",AutorEmail);
                                var autorImageURL = Platform.Function.Lookup("NewsletterAutoren","autorImageURL",["email","nlPermission"],[AutorEmail,newsletterPermission]);

                                if ( AutorEmail.length > 0 && AutorName.length > 0 ) {
                                    var replacementAutor = {
                                        replacements: [
                                            {
                                                name: 'AUTORNAME',
                                                value:  AutorName
                                            },
                                            {
                                                name: 'AUTORPOSITION',
                                                value:  AutorPosition
                                            },
                                            {
                                                name: 'AUTORIMAGEURL',
                                                value:  autorImageURL
                                            }
                                        ]
                                    };
                                    if (blankIntro == false) {
                                    createContentBlock('introauthor', 'NLAPP_introAuthor', assetTypeFreeForm, replacementAutor, 'nlcontent');
                                    }
                                    var replacementOuterBGColor =  {
                                                replacements: [
                                                    {
                                                        name: 'TEMPLATEBACKGROUNDCOLOR',
                                                        value: '%%' + '=v(@templateBackgroundColor)=' + '%%'   
                                                    }
                                                ]
                                            };
                                    if (blankIntro == false) {
                                    createContentBlock('spacerintro1', 'NLAPP_separator8outerBGColor', assetTypeFreeForm, replacementOuterBGColor, 'nlcontent');
                                    }
                                }
                            
                                var articlesJSON = json.articlesJSON;
                                responseJSON.articlesJSON = articlesJSON;
                                var dropzones = articlesJSON.dropzones;
                                responseJSON.dropzonesLen = dropzones.length;
                                var allItems = [];
                                var debug1 = {};
                                debug1.status = "Test";
                            
                                // Iterate over each dropzone
                                for (var i = 0; i < dropzones.length; i++) {
                                
                                    var dropzone = dropzones[i];
                                    var items = dropzone.items;
                                    responseJSON['dropzone_' + (i + 1) + '_itemsLen'] = items.length;

                                    //var itemIds = [];

                                
                                    var countArticles = articlesJSON.dropzones[i].items.length;
                                    if (countArticles > 0) {
                                        if (i == 0) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric1Title","Id",newsletterPermission);
                                        }
                                        if (i == 1) {
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric2Title","Id",newsletterPermission);
                                        }
                                        if (i == 2) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric3Title","Id",newsletterPermission);
                                        }
                                        if (i == 3) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric4Title","Id",newsletterPermission);
                                        }
                                        if (i == 4) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric5Title","Id",newsletterPermission);
                                        }
                                        if (i == 5) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric6Title","Id",newsletterPermission);
                                        }
                                        if (i == 6) { 
                                            var rubricTitle = Platform.Function.Lookup("NewsletterTypes","rubric7Title","Id",newsletterPermission);
                                        }
                                    
                                        //var mainTitleBackgroundColor2 = Platform.Function.Lookup('ENT.emailContentSets','elementValue',['businessUnit','brand','elementName'],[nlMID,brand,'mainTitleBackgroundColor']);
                                        var replacementRessort = {
                                            replacements: [
                                                {
                                                    name: 'TITEL',
                                                    value: rubricTitle
                                                },
                                                {
                                                    name: 'MAINTITLEBACKGROUNDCOLOR',
                                                    //value: mainTitleBackgroundColor2
                                                     value: '%%' + '=v(@mainTitleBackgroundColor)=' + '%%'  
                                                },
                                                {
                                                    name: 'MAINTITLEFONTCOLOR',
                                                    //value: mainTitleBackgroundColor2
                                                     value: '%%' + '=v(@mainTitleFontColor)=' + '%%'  
                                                }
                                            ]
                                        };
                                        createContentBlock('rubrictitle' +i+1, 'NLAPP_rubricTitle', assetTypeFreeForm, replacementRessort, 'nlcontent');
                                        createContentBlock('spacer'+i, 'NLAPP_separator8innerBGColor', assetTypeFreeForm, '', 'nlcontent');
                                        createContentBlock('spacer'+i+4, 'NLAPP_separator8innerBGColor', assetTypeFreeForm, '', 'nlcontent');
                                        createContentBlock('spacer'+i+8, 'NLAPP_separator8innerBGColor', assetTypeFreeForm, '', 'nlcontent');
                    
                                        //} 
                                        //try {
                                            for (var j = 0; j < countArticles; j++) {
                                                //try {  
                                                    var itemId = articlesJSON.dropzones[i].items[j].itemId;
                                                    /* var zeitungName = json.zeitungName;
                                                    var zeitungURL = zeitungName.toLowerCase().replace(/\s+/g, '');
                                                    zeitungURL = zeitungURL.replace(/ü/g, 'ue'); // Replace 'ü' with 'ue'
                                                    zeitungURL = zeitungURL.replace(/ä/g, 'ae'); // Replace 'ä' with 'ae' */
                                                    var zeitungUrl = Platform.Function.Lookup("NewsletterTypes","zeitungUrl","Id",newsletterPermission);
                                                    //var zeitungUrl = "ruhrnachrichten";
                                                    /* if (!zeitungUrl) {
                                                        throw new Error('Failed to retrieve zeitungUrl from the NewsletterTypes Data Extension.');
                                                    } */

                                                    //var requestJSON = HTTP.Get('https://www.' + zeitungUrl + '.de/wp-json/wp/v2/posts/' + itemId);
                                                    /* if (requestJSON.statusCode != 200) {
                                                        //TRY CATCH, damit kein 500er kommt
                                                        // Response ausgeben

                                                    } */
                                                    

                                                    // NEUER BASIC AUTH WP-API-CALL
                                                    var requestUrl = 'https://www.' + zeitungUrl + '.de/wp-json/wp/v2/posts/' + itemId;
                                                    
                                                    var user = 'rumble-newsletter-app';
                                                    
                                                    //var password = 'NQt3 NgqP DdnU ik4L swGK sf5d';
                                                    var password = Platform.Function.Lookup("NewsletterTypes","wpapipw","Id",newsletterPermission);
                                                   
                                                    var auth = 'Basic ' + Platform.Function.Base64Encode(user + ':' + password);
                                                    var headerNames = ["Authorization", "contentType"];
                                                    var headerValues = [auth, "application/json"];
                                                    //var contentType = 'application/json';
                                                    //var header = 'Authorization: ' + auth;
                                                    

                                                    //var content = debug == "test" ? HTTP.Get(requestUrl, header)["Content"] : HTTP.Get(requestUrl)["Content"];
                                                    //var content = HTTP.Get(requestUrl, header)["Content"];
                                                    
                                                    var response = HTTP.Get(requestUrl, headerNames, headerValues);

                                                    /* if (!response || response.StatusCode != 200) {
                                                        throw new Error(`HTTP GET failed for URL: ${requestUrl}. Status Code: ${response ? response.StatusCode : 'No Response'}`);
                                                    } */

                                                

                                                    var articleJSON = Platform.Function.ParseJSON(String(response.Content));

                                                    /* if (!articleJSON) {
                                                        throw new Error(`Failed to parse JSON response for item ID: ${itemId}`);
                                                    }*/

                                                    var articleImage = articleJSON.yoast_head_json.og_image[0].url;
                                                    var articleTitle1 = articleJSON.rumble_app_meta.title1;
                                                    var articleTitle2 = articleJSON.rumble_app_meta.title2;
                                                    var articleExcerpt = articleJSON.excerpt.rendered;
                                                    var articleLink = articleJSON.link;
                                                    var paidcontent = articleJSON.rumble_app_meta.paidcontent;
                                                    //var premiumIcon = '<img alt="RN+" height="17" src="PREMIUMICONSOURCE" style="text-align: center; height: 17px; width: 32px; margin: 0; border: 0;" width="32">';
                                                    //var articleContent = articleJSON.content.rendered;
                                                    //articleContent = articleContent.slice(0, 500);

                                                    var replacemenTestImage = {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLEIMAGE',
                                                                value: articleImage
                                                            },
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            }
                                                        ]
                                                    };
                                                    createContentBlock('image' +j+i, 'NLAPP_articleImage', assetTypeFreeForm, replacemenTestImage, 'nlcontent');

                                                    if (paidcontent) {
                                                        
                                                        var replacemenTestHeadline = {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLETITLE',
                                                                value: articleTitle1
                                                            },
                                                            {
                                                                name: 'ARTICLETEASER',
                                                                value: articleTitle2
                                                            },
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            }                                 
                                                        ]
                                                    };

                                                    createContentBlock('headline'+j+i, 'NLAPP_articleHeadlinePlus', assetTypeFreeForm, replacemenTestHeadline, 'nlcontent');
                                                    
                                                    } else {
                                                        var replacemenTestHeadline = {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLETITLE',
                                                                value: articleTitle1
                                                            },
                                                            {
                                                                name: 'ARTICLETEASER',
                                                                value: articleTitle2
                                                            },
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            }                                   
                                                        ]
                                                    };
                                                    
                                                    createContentBlock('headline'+j+i, 'NLAPP_articleHeadline', assetTypeFreeForm, replacemenTestHeadline, 'nlcontent');
                                                    
                                                    }

                                                    var replacemenTestText = {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLETEXT',
                                                                value: articleExcerpt
                                                            },
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            } 
                                                        ]
                                                    };
                                                    createContentBlock('text'+j+i, 'NLAPP_articleTextContent', assetTypeFreeForm, replacemenTestText, 'nlcontent');
                                                    
                                                    var replacementReadmore= {
                                                        replacements: [
                                                            {
                                                                name: 'ARTICLELINK',
                                                                value: articleLink         
                                                            } 
                                                        ]
                                                    };
                                                    createContentBlock('readmorelink'+j+i, 'NLAPP_articleMoreLink', assetTypeFreeForm, replacementReadmore, 'nlcontent');

                                                /* } catch (articleError) {
                                                Write(`<p>Error processing article with itemId: ${itemId}</p>`);
                                                Write(`<p>Error Message: ${articleError.message}</p>`);
                                                } */
                                            
                                                //AD POSITIONEN UND FALLBACKS
                                                var fallbackb1 = false;
                                                var fallbackb2 = true;
                                                var fallbackc1 = true;
                                            
                                                /* if (i == 0 && j == 0 ){
                                                    fallbackb1 = false;
                                                } */
                                                if (i == 0 && j >= 2){                                                
                                                    fallbackc1 = false;
                                                }
                                                if (i == 0 && j >= 1){
                                                    fallbackb2 = false;
                                                }
                                                
                                                var codeplacementc1 = '%' + '%[ SET @now = Now() set @localDate =  SystemDateToLocalDate(@now) SET @day = FormatDate(@localDate, "DD") SET @month = FormatDate(@localDate, "MM") SET @year = FormatDate(@localDate, "YYYY") SET @formattedDate = Concat(@day, "-", @month, "-", @year) SET @adJSONC1 = Lookup("ENT.NewsletterAds", "adJSON", "permissionType", @permissionType, "adTyp", "c1", "requestDate", @formattedDate) IF NOT EMPTY(@adJSONC1) THEN SET @adImageC1 = RegExMatch(@adJSONC1, \'"image_url"\\s*:\\s*"([^"]+)"\', 1) SET @adLinkC1 = RegExMatch(@adJSONC1, \'"ad_url"\\s*:\\s*"([^"]+)"\', 1) SET @adTitle1C1 = RegExMatch(@adJSONC1, \'"titel1"\\s*:\\s*"([^"]+)"\', 1) SET @adTitle2C1 = RegExMatch(@adJSONC1, \'"titel2"\\s*:\\s*"([^"]+)"\', 1) SET @adBodyC1 = RegExMatch(@adJSONC1, \'"body"\\s*:\\s*"([^"]+)"\', 1) ENDIF IF NOT EMPTY (@adJSONC1) AND @adJSONC1 != "default" THEN SET @hasC1 = true ELSE SET @hasC1 = false ENDIF ]%' + '%';
                                                var codeplacementb1 = '%' + '%[ SET @now = Now() set @localDate =  SystemDateToLocalDate(@now) SET @day = FormatDate(@localDate, "DD") SET @month = FormatDate(@localDate, "MM") SET @year = FormatDate(@localDate, "YYYY") SET @formattedDate = Concat(@day, "-", @month, "-", @year) SET @adJSONB1 = Lookup("ENT.NewsletterAds", "adJSON", "permissionType",@permissionType, "adTyp", "b1", "requestDate", @formattedDate) IF NOT EMPTY(@adJSONB1) THEN SET @adImageB1 = RegExMatch(@adJSONB1, \'"image_url"\\s*:\\s*"([^"]+)"\', 1) SET @adLinkB1 = RegExMatch(@adJSONB1, \'"ad_url"\\s*:\\s*"([^"]+)"\', 1) ENDIF IF NOT EMPTY (@adJSONB1) AND @adJSONB1 != "default" THEN SET @hasB1 = true ELSE SET @hasB1 = false ENDIF]%' + '%';
                                                var codeplacementb2 = '%' + '%[ SET @now = Now() set @localDate =  SystemDateToLocalDate(@now) SET @day = FormatDate(@localDate, "DD") SET @month = FormatDate(@localDate, "MM") SET @year = FormatDate(@localDate, "YYYY") SET @formattedDate = Concat(@day, "-", @month, "-", @year) SET @adJSONB2 = Lookup("ENT.NewsletterAds", "adJSON", "permissionType", @permissionType, "adTyp", "b2", "requestDate", @formattedDate) IF NOT EMPTY(@adJSONB2) THEN SET @adImageB2 = RegExMatch(@adJSONB2, \'"image_url"\\s*:\\s*"([^"]+)"\', 1) SET @adLinkB2 = RegExMatch(@adJSONB2, \'"ad_url"\\s*:\\s*"([^"]+)"\', 1) ENDIF IF NOT EMPTY (@adJSONB2) AND @adJSONB2 != "default" THEN SET @hasB2 = true ELSE SET @hasB2 = false ENDIF]%' + '%';

                                                var replacementAdb1= {
                                                    replacements: [
                                                        {
                                                            name: 'CODEPLACEMENT',
                                                            value: codeplacementb1
                                                        }
                                                    ]
                                                };

                                                var replacementAdb2= {
                                                    replacements: [
                                                        {
                                                            name: 'CODEPLACEMENT',
                                                            value: codeplacementb2
                                                        }
                                                    ]
                                                };

                                                var replacementAdc1= {
                                                    replacements: [
                                                        {
                                                            name: 'CODEPLACEMENT',
                                                            value: codeplacementc1
                                                        }
                                                    ]
                                                };


                                                //AD POSI B1
                                                if (i == 0 && j == 0 && fallbackb1 == false)
                                                {
                                                    createContentBlock('test1', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdb1, 'nlcontent');
                                                    createContentBlock('test2', 'NLAPP_adb1', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                                //FALL BACK B1
                                                /* if (i == 0 && j == (countArticles-1) && fallbackb1 == true)  
                                                {
                                                    createContentBlock('test3', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdb1, 'nlcontent');
                                                    createContentBlock('test4', 'NLAPP_adb1', assetTypeReferenceBlock, {}, 'nlcontent');
                                                } */
                                                //AD POSI C1
                                                if (i == 0 && j == 2 && fallbackc1 == false) {
                                                    //HIER CONTENT AD  C1
                                                    createContentBlock('adc1logic', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdc1, 'nlcontent');
                                                    createContentBlock('adc1', 'NLAPP_adc1', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                                //FALLBACK C1
                                                if (i == 0 && j == (countArticles-1) && fallbackc1 == true)
                                                {
                                                    createContentBlock('adc1logic', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdc1, 'nlcontent');
                                                    createContentBlock('adc1fb', 'NLAPP_adc1', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                                // AD POSI B2
                                                if (i == 0 && j == (countArticles-1) && fallbackb2 == false) {
                                                    createContentBlock('adb2logic', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdb2, 'nlcontent');
                                                    createContentBlock('adb2', 'NLAPP_adb2', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                                //FALLBACK B2
                                                if (i == 0 && j == (countArticles-1) && fallbackb2 == true) {
                                                    createContentBlock('adb2logic', 'NLAPP_adLogicDyn', assetTypeCode, replacementAdb2, 'nlcontent');
                                                    createContentBlock('adb2', 'NLAPP_adb2', assetTypeReferenceBlock, {}, 'nlcontent');
                                                }
                                            }
                                        /* } catch (generalError) {
                                            Write(`<p>An error occurred while processing the articles:</p>`);
                                            Write(`<p>Error Message: ${generalError.message}</p>`);
                                        } */
                                    }
                                    //responseJSON['dropzone_' + (i + 1) + '_itemId_' + (j + 1)] = itemId;
                                }


                                var replacementOuterBGColor =  {
                                                replacements: [
                                                    {
                                                        name: 'TEMPLATEBACKGROUNDCOLOR',
                                                        value: '%%' + '=v(@templateBackgroundColor)=' + '%%'   
                                                    }
                                                ]
                                            };
                                createContentBlock('spacerX', 'NLAPP_separator8outerBGColor', assetTypeFreeForm, replacementOuterBGColor, 'nlcontent');
                                //createContentBlock('spacerAd1', 'NLAPP_separator8outerBGColor', assetTypeFreeForm, '', 'nlcontent');
                                //createContentBlock('spacerX', 'NLAPP_separator8outerBGColor', assetTypeFreeForm, '', 'nlcontent');
                                
                                var nlidpart1 = new Date().getTime();
                                //var nlidpart2 = "RandomNumber"
                                var UNLId = nlidpart1;
                                //var UNLId = nlidpart1 + nlidpart2;
                                //var UNLId = "222";
                                
                                var codeplacementftaf = '%' + '%[ set @UNLId = ' + UNLId + ']%' + '%';
                                //var codeplacementftaf = "321";
                                var replacementFTAFCode =  {
                                    replacements: [
                                        {
                                            name: 'CODEREPLACEMENTFTAF',
                                            value: codeplacementftaf  
                                        }
                                    ]
                                };

                                createContentBlock('forwardtoafriendcode', 'footerFTAFCode', assetTypeCode, replacementFTAFCode, 'nlcontent');
                                createContentBlock('forwardtoafriend', 'footerFTAFHtml', assetTypeReferenceBlock, {}, 'nlcontent'); 
                                
                            }
                            
                            //Styles aus emailBranding
                            var mainFontColor = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainFontColor']);
                            var mainLinkColor = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainLinkColor']);
                            var mainFontFamily = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainFontFamily']);
                            var mainTitleBackgroundColor = Platform.Function.Lookup('ENT.emailContentSets','elementValue',['businessUnit','brand','elementName'],[nlMID,brand,'mainTitleBackgroundColor']);
                            // Check if the value is null or empty
                            if (!mainTitleBackgroundColor) {
                                // Fallback to the second lookup
                               mainTitleBackgroundColor = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainTitleBackgroundColor']);
                            }
                            //var mainTitleBackgroundColor = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainTitleBackgroundColor']);
                            var mainTitleFontFamily = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainTitleFontFamily']);
                            var mainTitleFontColor = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainTitleFontColor']);
                            var mainTitleFontSize = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainTitleFontSize']);
                            var mainTitleLineHeight = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainTitleLineHeight']);
                            var templateBackgroundColor = Platform.Function.Lookup('ENT.emailContentSets','elementValue',['businessUnit','brand','elementName'],[nlMID,brand,'templateBackgroundColor']);
                            // Check if the value is null or empty
                            if (!templateBackgroundColor) {
                                // Fallback to the second lookup
                                templateBackgroundColor = Platform.Function.Lookup('ENT.emailBranding', 'textContent', ['businessUnit', 'brand', 'textId'], [nlMID, brand, 'templateBackgroundColor']);
                            }
                            //var templateBackgroundColor = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'templateBackgroundColor']);
                            var mainHeadlineFontSize = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainHeadlineFontSize']);
                            var mainTitleLineHeight = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainTitleLineHeight']);
                            var mainSalutationFontSize = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainSalutationFontSize']);
                            var mainSalutationLineHeight = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainSalutationLineHeight']);                                var mainSubtitleLineHeight = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainSubtitleLineHeight']);
                            var mainSubtitleFontSize = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'mainSubtitleFontSize']);
                            var outerPadding = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'outerPadding']);
                            var innerPadding = Platform.Function.Lookup('ENT.emailBranding','textContent',['businessUnit','brand','textId'],[nlMID,brand,'innerPadding']);
                            var AutorName = Platform.Function.Lookup("NewsletterAutoren","Autor","email",AutorEmail);
                            var AutorPosition = Platform.Function.Lookup("NewsletterAutoren","position","email",AutorEmail);
                            var autorImageURL = Platform.Function.Lookup("NewsletterAutoren","autorImageURL","email",AutorEmail);
                            var premiumIconSource = Platform.Function.Lookup("ENT.emailBranding",'textContent',['businessUnit','brand','textId'],[nlMID,brand,'premiumIconSource']);
                            var templateInnerBackgroundColor = Platform.Function.Lookup("ENT.emailBranding",'textContent',['businessUnit','brand','textId'],[nlMID,brand,'templateInnerBackgroundColor']);
                            var footerFontColor = Platform.Function.Lookup("ENT.emailBranding",'textContent',['businessUnit','brand','textId'],[nlMID,brand,'footerFontColor']);

                            // EMAIL PAYLOAD STRINGIFYn -> REPLACE ALL -> PARSEJSON
                            emailPayload = Stringify(emailPayload);
                            emailPayload = emailPayload.replace(/MAINFONTCOLOR/g, mainFontColor);
                            emailPayload = emailPayload.replace(/MAINLINKCOLOR/g, mainLinkColor);
                            emailPayload = emailPayload.replace(/MAINFONTFAMILY/g, mainFontFamily);
                            emailPayload = emailPayload.replace(/MAINTITLEBACKGROUNDCOLOR/g, mainTitleBackgroundColor);
                            emailPayload = emailPayload.replace(/MAINTITLEFONTFAMILY/g, mainTitleFontFamily);
                            emailPayload = emailPayload.replace(/MAINTITLEFONTCOLOR/g, mainTitleFontColor);
                            emailPayload = emailPayload.replace(/MAINTITLEFONTSIZE/g, mainTitleFontSize);
                            emailPayload = emailPayload.replace(/MAINTITLELINEHEIGHT/g, mainTitleLineHeight);
                            emailPayload = emailPayload.replace(/MAINSUBTITLEFONTSIZE/g, mainSubtitleFontSize);
                            emailPayload = emailPayload.replace(/MAINSUBTITLELINEHEIGHT/g, mainSubtitleLineHeight);
                            emailPayload = emailPayload.replace(/TEMPLATEBACKGROUNDCOLOR/g, templateBackgroundColor);
                            emailPayload = emailPayload.replace(/MAINHEADLINEFONTSIZE/g, mainHeadlineFontSize);
                            emailPayload = emailPayload.replace(/MAINSALUTATIONFONTSIZE/g, mainSalutationFontSize);
                            emailPayload = emailPayload.replace(/MAINSALUTATIONLINEHEIGHT/g, mainSalutationLineHeight);
                            emailPayload = emailPayload.replace(/OUTERPADDING/g, outerPadding);
                            emailPayload = emailPayload.replace(/INNERPADDING/g, innerPadding);
                            emailPayload = emailPayload.replace(/AUTORNAME/g, AutorName);
                            emailPayload = emailPayload.replace(/AUTORPOSITION/g, AutorPosition);
                            emailPayload = emailPayload.replace(/AUTORIMAGEURL/g, autorImageURL);
                            emailPayload = emailPayload.replace(/PREMIUMICONSOURCE/g, premiumIconSource);
                            emailPayload = emailPayload.replace(/TEMPLATEINNERBACKGROUNDCOLOR/g, templateInnerBackgroundColor);  
                                
                            emailPayload = Platform.Function.ParseJSON(emailPayload);

                            // CREATE EMAIL
                            var emailResp = sendRequest('POST',emailURL,emailPayload);
                            
                            var emailRespJSON = Platform.Function.ParseJSON(String(emailResp.content));
                            var emailId = emailRespJSON.data.email.legacy.legacyId;
                            var emailAssetId = emailRespJSON.id;
                            emailResponse.payload = emailPayload;
                            emailResponse.emailStatus = emailResp.statusCode; 
                            Variable.SetValue('@emailPayload',Stringify(emailPayload));  

                            responseJSON.email = emailResponse;

                            if (emailResp.statusCode == 200 || emailResp.statusCode == 201 ) {

                                responseJSON.statusCode = '200';
                                responseJSON.statusMessage = 'Email created.';
                                emailResponse.emailId = emailId;
                                emailResponse.assetId = emailAssetId;

                                var emailIdLog = Platform.Function.UpsertData("LastEmailID",["Newsletter"],[newsletterLogName],["Date","EmailId","AssetId"],[timestamp,emailId,emailAssetId]);
                                
                                // HIER PREVIEW CODE
                                var previewUrl = restURL + '/guide/v1/emails/' + emailId + '/dataExtension/key:previewSubscriber/contacts/key:preview@rumble.de/preview?kind=html';
                                emailResponse.previewUrl = previewUrl;
                                var previewResp = sendRequest("POST", previewUrl);
                                var previewRespJSON = Platform.Function.ParseJSON(String(previewResp.content));
                                var previewHTML = previewRespJSON.message.views[0].content;
                                if (previewResp.statusCode == 200 || previewResp.statusCode == 201) {
                                    var previewLog = Platform.Function.InsertData("PreviewLog",["Date","Newsletter","HTML","UNLId"],[timestamp,newsletterLogName,previewHTML,UNLId]);
                                    //var sentLogRNC = Platform.Function.InsertData("SentLogRNC",["UNLId","Newsletter","HTML"],[UNLId,newsletterLogName,previewHTML]);
                                    responseJSON.statusCode = '200';
                                    responseJSON.statusMessage = 'Preview created.';
                                    emailResponse.previewStatus = previewResp.statusCode;
                                    emailResponse.previewHTML = previewHTML;  
                                } else {
                                    responseJSON.statusCode = '400';
                                    responseJSON.statusMessage = 'Preview failed.';
                                    emailResponse.previewStatus = previewResp.statusCode;
                                    setStatus('400','Preview failed',previewResp.content);
                                }  
                            }
                        }
                    } else {
                        if (getEmailId == null || getEmailId == undefined) {
                            var emailId = Platform.Function.Lookup('LastEmailID','EmailId','Newsletter',newsletterLogName);
                            var assetId = Platform.Function.Lookup('LastEmailID','AssetId','Newsletter',newsletterLogName);
                            //var emailId = Platform.Function.Lookup('LastEmailID','EmailId','Newsletter',newsletterPermission);
                            //var assetId = Platform.Function.Lookup('LastEmailID','AssetId','Newsletter',newsletterPermission);
                        } else {
                            var emailId = getEmailId;
                            var assetId = getAssetId;
                        }       
                    }

                    if (mode == 'send' && emailId != null && emailId != undefined) {
                        if (nlStructure == "eilmeldung") { 
                            // Get current Journey
                            var journeyNameDEV = newsletterPermission + "_EILMELDUNG";
                            //var journeyNameDEV = "DEV_JOURNEY";
                            var journeyNameLIVE = newsletterPermission + "_EILMELDUNG";
                            var journeyName = dev == false ? journeyNameLIVE : journeyNameDEV;
                            journeyResponse.name = journeyName;
                            //var deNameLive = newsletterPermission + "_NewsletterSegment";
                            //var journeyFolderIdEil = "173479";
                            //var journeyFolderIdEil = "214840";
                            //var journeyFolderIdEil = "214871";
                            var getJourneyIdFromNewsletterTypes = Platform.Function.Lookup('ENT.NewsletterTypes','journeyFolderId', 'Id',newsletterPermission);
                            //var journeyFolderId = dev == false ? getJourneyIdFromNewsletterTypes : "9585";
                            var journeyFolderIdEil = dev == false ? getJourneyIdFromNewsletterTypes : getJourneyIdFromNewsletterTypes;
                            var deNameLive = deNameEil;
                            var deNameDev = "DEV_JourneyDE2";
                            //var deName = dev == false ? deNameLive : deNameDev;
                            var deName = dev == false ? deNameLive : deNameDev;
                            //var deName = deNameLive;
                            
                            var urlDEGet = restURL + '/data/v1/customobjectdata/key/' + deName + '/rowset';
                            var DEGetResp = sendRequest('GET',urlDEGet);
                            var DEGetRespJSON = Platform.Function.ParseJSON(String(DEGetResp.content));
                            var deId = DEGetRespJSON.customObjectId;

                            journeyResponse.deId = deId;

                            var edk = 'DEAudience-' + GUID();
                            var urlSetEntryEvent = restURL + '/interaction/v1/eventDefinitions/';

                            var entryType = 'Run Once';

                            var entryEventPayload = {
                                type: "EmailAudience",
                                name: journeyName,
                                description: "",
                                mode: "Production",
                                eventDefinitionKey: edk,
                                dataExtensionId: deId,
                                dataExtensionName : deName,
                                sourceApplicationExtensionId: "97e942ee-6914-4d3d-9e52-37ecb71f79ed",
                                filterDefinitionId: "00000000-0000-0000-0000-000000000000",
                                filterDefinitionTemplate: "",
                                iconUrl: "/images/icon-data-extension.svg",
                                arguments: {
                                    serializedObjectType: 3,
                                    useHighWatermark: false,
                                    eventDefinitionKey: edk,
                                    dataExtensionId: deId,
                                    criteria: ""
                                },
                                configurationArguments: {
                                    unconfigured: false
                                },
                                metaData: {
                                    criteriaDescription: "",
                                    scheduleFlowMode: "runOnce",
                                    runOnceScheduleMode: "onPublish"
                                },
                                interactionCount: 4,
                                isVisibleInPicker: false,
                                isPlatformObject: false,
                                category: "Audience",
                                publishedInteractionCount: 1,
                                disableDEDataLogging: false
                            }

                            var setEntryResp = sendRequest('POST',urlSetEntryEvent,entryEventPayload);
                            var setEntryRespJSON = Platform.Function.ParseJSON(String(setEntryResp.content));
                            var oldEntryEDK = entryEDK;
                            var entryEDI = setEntryRespJSON.id;
                            var entryEDK = setEntryRespJSON.eventDefinitionKey;

                            var defaultEmail = '{{Event.' + entryEDK + '.\"email\"}}';

                            journeyResponse.entryEventPayload = entryEventPayload;
                            journeyResponse.entryType = entryType;
                            journeyResponse.entryResp = setEntryRespJSON;
                            journeyResponse.newEventDefinitionId = entryEDI;
                            journeyResponse.newEventDefinitionKey = entryEDK;
                            journeyResponse.newdefaultEmail = defaultEmail;

                            if (setEntryResp.statusCode == 200 || setEntryResp.statusCode == 201) { 

                                setStatus('200','Entry Event created');
                                // Create new Journey Version

                                var urlJourneyCreate = restURL + '/interaction/v1/interactions';
                                var payloadCreateJourney = {
                                    key: edk,
                                    name: journeyName,
                                    description: "",
                                    version: 1,
                                    workflowApiVersion: 1.0,
                                    activities: [
                                        {
                                            key: "EMAILV2-1",
                                            name: emailName,
                                            description: "",
                                            type: "EMAILV2",
                                            outcomes: [
                                                {
                                                    key: "f1b7862b-c1c3-46e4-b695-ce6c0d4916f0",
                                                    arguments: {},
                                                    metaData: {
                                                        invalid: false
                                                    }
                                                }
                                            ],
                                            arguments: {
                                                activityId: "{{Activity.Id}}",
                                                definitionId: "{{Context.DefinitionId}}",
                                                emailSubjectDataBound: "Tst",
                                                contactId: "{{Contact.Id}}",
                                                contactKey: "{{Contact.Key}}",
                                                emailAddress: "{{InteractionDefaults.Email}}",
                                                sourceCustomObjectId: "{{Contact.AddressInfo.Email.SourceCustomObjectId}}",
                                                sourceCustomObjectKey: "{{Contact.AddressInfo.Email.SourceCustomObjectKey}}",
                                                fieldType: "{{Contact.AddressInfo.Email.FieldType}}",
                                                eventData: "{{Event}}",
                                                obfuscationProperties: "{{InteractionDefaults.Email.ObfuscationProperties}}",
                                                customObjectKey: "",
                                                definitionInstanceId: "{{Context.DefinitionInstanceId}}"
                                            },
                                            configurationArguments: {
                                                triggeredSend: {
                                                    autoAddSubscribers: true,
                                                    autoUpdateSubscribers: true,
                                                    bccEmail: "",
                                                    ccEmail: "",
                                                    created: {},
                                                    domainExclusions: [],
                                                    dynamicEmailSubject: nlSubject,
                                                    emailId: emailId,
                                                    emailSubject: nlSubject,
                                                    //Änderung PreHeader
                                                    preHeader: nlPreHeader,
                                                    exclusionFilter: "",
                                                    isSalesforceTracking: false,
                                                    isMultipart: true,
                                                    isSendLogging: true,
                                                    isStoppedOnJobError: false,
                                                    modified: {},
                                                    priority: 4,
                                                    //aktuelle sendClassification, delProf, senderPro -> DYNAMISIEREN!
                                                    sendClassificationId: nlSendClassification,
                                                    throttleOpens: "1/1/0001 12:00:00 AM",
                                                    throttleCloses: "1/1/0001 12:00:00 AM",
                                                    deliveryProfileId: nlDeliveryProfile,
                                                    senderProfileId: nlSenderProfile,
                                                    isTrackingClicks: true,
                                                    publicationListId: 732
                                                },
                                                applicationExtensionKey: "jb-email-activity",
                                                isModified: false,
                                                isSimulation: false,
                                                googleAnalyticsCampaignName: "",
                                                useLLTS: false,
                                                fuelAgentRequested: false
                                            },
                                            metaData: {
                                                category: "message",
                                                version: "1.0",
                                                icon: "https://jb-email-activity.s7.marketingcloudapps.com/img/email-icon.svg",
                                                iconSmall: "https://jb-email-activity.s7.marketingcloudapps.com/img/email-icon.svg",
                                                statsContactIcon: "",
                                                original_icon: "/img/email-icon.svg",
                                                original_iconSmall: "/img/email-icon.svg",
                                                sections: {},
                                                isConfigured: true
                                            },
                                            schema: {
                                                arguments: {
                                                    requestID: {
                                                        dataType: "Text",
                                                        isNullable: true,
                                                        direction: "Out",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    messageKey: {
                                                        dataType: "Text",
                                                        isNullable: true,
                                                        direction: "Out",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    activityId: {
                                                        dataType: "Text",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    definitionId: {
                                                        dataType: "Text",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: true,
                                                        access: "Hidden"
                                                    },
                                                    emailSubjectDataBound: {
                                                        dataType: "Text",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: true,
                                                        access: "Hidden"
                                                    },
                                                    contactId: {
                                                        dataType: "Number",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    contactKey: {
                                                        dataType: "Text",
                                                        isNullable: false,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    emailAddress: {
                                                        dataType: "Text",
                                                        isNullable: false,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    sourceCustomObjectId: {
                                                        dataType: "Text",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    sourceCustomObjectKey: {
                                                        dataType: "LongNumber",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    fieldType: {
                                                        dataType: "Text",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    eventData: {
                                                        dataType: "Text",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    obfuscationProperties: {
                                                        dataType: "Text",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    },
                                                    customObjectKey: {
                                                        dataType: "LongNumber",
                                                        isNullable: true,
                                                        direction: "In",
                                                        readOnly: true,
                                                        access: "Hidden"
                                                    },
                                                    definitionInstanceId: {
                                                        dataType: "Text",
                                                        isNullable: false,
                                                        direction: "In",
                                                        readOnly: false,
                                                        access: "Hidden"
                                                    }
                                                }
                                            }
                                        }
                                    ],
                                    triggers: [
                                        {
                                            id: entryEDI,
                                            key: "TRIGGER",
                                            name: "TRIGGER",
                                            description: "",
                                            type: "EmailAudience",
                                            outcomes: [],
                                            arguments: {
                                                startActivityKey: "{{Context.StartActivityKey}}",
                                                dequeueReason: "{{Context.DequeueReason}}",
                                                lastExecutedActivityKey: "{{Context.LastExecutedActivityKey}}",
                                                filterResult: "true"
                                            },
                                            configurationArguments: {
                                                schemaVersionId: 0,
                                                criteria: "",
                                                filterDefinitionId: "00000000-0000-0000-0000-000000000000"
                                            },
                                            metaData: {
                                                eventDefinitionId: entryEDI,
                                                eventDefinitionKey: entryEDK,
                                                chainType: "None",
                                                configurationRequired: false,
                                                iconUrl: "/images/icon-data-extension.svg",
                                                title: "Data Extension",
                                                entrySourceGroupConfigUrl: "jb:///data/entry/audience/entrysourcegroupconfig.json",
                                                sourceInteractionId: "00000000-0000-0000-0000-000000000000"
                                            }
                                        }
                                    ],
                                    goals: [],
                                    exits: [],
                                    notifiers: [],
                                    stats: {
                                        currentPopulation: 0,
                                        cumulativePopulation: 0,
                                        metGoal: 0,
                                        metExitCriteria: 0,
                                        goalPerformance: 0.0
                                    },
                                    entryMode: "MultipleEntries",
                                    definitionType: "Quicksend",
                                    channel: "email",
                                    defaults: {
                                        email: [
                                            defaultEmail
                                        ],
                                        properties: {
                                            analyticsTracking: {
                                                enabled: false,
                                                analyticsType: "google",
                                                urlDomainsToTrack: []
                                            }
                                        }
                                    },
                                    metaData: {
                                        dataSource: "ContactsModel",
                                        isScheduleSet: true
                                    },
                                    executionMode: "Production",
                                    categoryId: journeyFolderIdEil,
                                    scheduledStatus: "None",
                                    status: "Draft"
                                }

                                payloadCreateJourney.metaData.eventDefinition = setEntryRespJSON;
                                journeyResponse.createPayload = payloadCreateJourney;
                                responseJSON.journeypayload = journeyResponse;
                                var journeyCreateResp = sendRequest('POST', urlJourneyCreate, payloadCreateJourney);
                                var journeyCreateRespJSON = Platform.Function.ParseJSON(String(journeyCreateResp.content));
                                var journeyId = journeyCreateRespJSON.id;

                                journeyResponse.createStatus = journeyCreateResp.statusCode;
                                journeyResponse.createPayload = payloadCreateJourney;
                                journeyResponse.journeyId = journeyId;

                                if (journeyCreateResp.statusCode == '200' ) {

                                    setStatus('200','New journey version created');
                                    var urlJourneyStart = restURL + '/interaction/v1/interactions/publishAsync/' + journeyId + '?versionNumber=1';
                                    var journeyStartResp = sendRequest('POST', urlJourneyStart);
                                    var journeyStartRespJSON = Platform.Function.ParseJSON(String(journeyStartResp.content));

                                    if (journeyStartResp.statusCode == '202' ) {
                                        //var vamHistory = Platform.Function.UpsertData("vamHistory",["vamId"],[vamId],["scheduledTime","status","journeyName"],[scheduledTimeSave,sendStatus,journeyId]);
                                    } else {
                                        journeyResponse.statusCode = '400';
                                        journeyResponse.statusMessage = 'Journey not activated';
                                        journeyResponse.errorResponse = journeyStartResp.content;
                                        setStatus('400','Journey not activated',journeyStartResp.content);
                                    }

                                } else {
                                    journeyResponse.statusCode = '400';
                                    journeyResponse.statusMessage = 'No new journey created';
                                    journeyResponse.errorResponse = journeyCreateResp.content;
                                    setStatus('400','No new journey created',journeyCreateResp.content);
                                }

                            } else {
                                journeyResponse.statusCode = '400';
                                journeyResponse.statusMessage = 'No entry event created';
                                journeyResponse.errorResponse = setEntryResp.content;
                                setStatus('400','No entry event created',setEntryResp.content);
                            }

                        } else if (nlStructure != "eilmeldung"){              
                            
                            var duplicateCheck;
                            // Get current Journey
                            var journeyName = dev == false ? dynamicJourneyName : "DEV_JOURNEY";
                            //var journeyName = "DEV_JOURNEY";
                            journeyResponse.name = journeyName;
                            var getJourneyIdFromNewsletterTypes = Platform.Function.Lookup('ENT.NewsletterTypes','journeyFolderId', 'Id',newsletterPermission);
                            //var journeyFolderId = dev == false ? getJourneyIdFromNewsletterTypes : "9585";
                            var journeyFolderId = dev == false ? getJourneyIdFromNewsletterTypes : getJourneyIdFromNewsletterTypes;
                            
                            var urlJourneyGet = restURL + '/interaction/v1/interactions?name=' + journeyName;
                            var journeyGetResp = sendRequest('GET',urlJourneyGet);
                            var journeyGetRespJSON = Platform.Function.ParseJSON(String(journeyGetResp.content));

                            // Initialize journeyResponse as an empty object
                            var journeyResponse = {};
                            
                            for (var i = 0; i < journeyGetRespJSON.items.length; i++) {
                                var journey = journeyGetRespJSON.items[i];

                                if (journey.name == journeyName && journey.definitionType == 'Multistep') {

                                    var journeyId = journey.id;
                                    var journeyVersion = journey.version;
                                    var oldJourneyVersion = journey.version;
                                    var journeyKey = journey.key;
                                    
                                    // Populate journeyResponse with the found journey's metadata
                                    journeyResponse.id = journeyId;
                                    journeyResponse.key = journeyKey;
                                    journeyResponse.prevVersion = oldJourneyVersion;
                                    journeyResponse.getStatus = journeyGetResp.statusCode;
                                    journeyResponse.lastPublishDate = journey.lastPublishedDate;
                                    break; // Exit the loop once the correct journey is found
                                }                            
                            }; 
                            /* var journeyId = journeyGetRespJSON.items[0].id;
                            var journeyVersion = journeyGetRespJSON.items[0].version;
                            var oldJourneyVersion = journeyGetRespJSON.items[0].version;
                            var journeyKey = journeyGetRespJSON.items[0].key;
                            journeyResponse.id = journeyId;
                            journeyResponse.key = journeyKey;
                            journeyResponse.prevVersion = oldJourneyVersion;
                            journeyResponse.getStatus = journeyGetResp.statusCode;
                            journeyResponse.lastPublishDate = journeyGetRespJSON.items[0].lastPublishedDate; */

                            // Get Subject Information
                            var urlEmailGet = restURL + '/asset/v1/content/assets/' + assetId;

                            var emailGetResp = sendRequest('GET',urlEmailGet);

                            var emailGetRespJSON = Platform.Function.ParseJSON(String(emailGetResp.content));
                            nlSubject = emailGetRespJSON.views.subjectline.content;
                            nlPreHeader = emailGetRespJSON.views.preheader.content;
                            //         duplicateCheck = emailGetRespJSON.views.html.slots.nlcontent.blocks.text1.content;

                            journeyResponse.subject = nlSubject;
                            journeyResponse.preHeader = nlPreHeader;
                        


                            if (journeyGetResp.statusCode = 200 || journeyGetResp.statusCode == 201 ) { 

                                setStatus('200','Journey found'); 
                                // Get Journey Entry Data 
                                var urlJourneyEntry = restURL + '/interaction/v1/interactions/' + journeyId + '?versionNumber=' + journeyVersion;

                                var journeyEntryResp = sendRequest('GET',urlJourneyEntry);
                                var journeyEntryRespJSON = Platform.Function.ParseJSON(String(journeyEntryResp.content));
                                var triggerId = journeyEntryRespJSON.triggers[0].id;
                                var entryEDI = journeyEntryRespJSON.triggers[0].metaData.eventDefinitionId;
                                var entryEDK = journeyEntryRespJSON.triggers[0].metaData.eventDefinitionKey;
                                var defaultEmail = journeyEntryRespJSON.defaults.email[0];
                                var journeyStatus = journeyEntryRespJSON.status;
                                var oldSubject = journeyEntryRespJSON.activities[0].configurationArguments.triggeredSend.emailSubject;
                                var oldpreHeader = journeyEntryRespJSON.activities[0].configurationArguments.triggeredSend.preHeader;
                                journeyResponse.triggerId = triggerId;
                                journeyResponse.eventDefinitionId = eventDefinitionId;
                                journeyResponse.eventDefinitionKey = eventDefinitionKey;
                                journeyResponse.defaultEmail = defaultEmail;
                                journeyResponse.status = journeyStatus;
                                var entryDEId;
                                var entryDEName;
                                var entrySAEId;
                                var entryAutomationId;

                                var urlEntryEventDefinition = restURL + '/interaction/v1/eventDefinitions/key:' + entryEDK;
                                var entryEventResp = sendRequest('GET',urlEntryEventDefinition);
                                var entryEventRespJSON = Platform.Function.ParseJSON(String(entryEventResp.content));
                                var deId = entryEventRespJSON.dataExtensionId;
                                var deName = entryEventRespJSON.dataExtensionName;
                                var sourceApplicationExtensionId = entryEventRespJSON.sourceApplicationExtensionId;
                                var automationId = entryEventRespJSON.automationId;
                                
                                    // Set Schedule Time

                                    if (scheduledTime) {

                                        var entryType = 'Scheduled';
                                        var edk = 'DEAudience-' + GUID();
                                        var urlSetEntryEvent = restURL + '/interaction/v1/eventDefinitions/';
                                        var entryEventPayload = {
                                            type: "EmailAudience",
                                            name: journeyName,
                                            description: "",
                                            mode: "Production",
                                            eventDefinitionKey: edk,
                                            dataExtensionId: deId,
                                            dataExtensionName: deName,
                                            sourceApplicationExtensionId: sourceApplicationExtensionId,
                                            filterDefinitionId: "00000000-0000-0000-0000-000000000000",
                                            filterDefinitionTemplate: "",
                                            iconUrl: "/images/icon-data-extension.svg",
                                            arguments: {
                                                serializedObjectType: 3,
                                                useHighWatermark: false,
                                                eventDefinitionKey: edk,
                                                dataExtensionId: deId,
                                                criteria: ""
                                            },
                                            configurationArguments: {
                                                unconfigured: false
                                            },
                                            metaData: {
                                                criteriaDescription: "",
                                                scheduleFlowMode: "runOnce",
                                                runOnceScheduleMode: "onSchedule"
                                            },
                                            schedule: {
                                                startDateTime: scheduledTime,
                                                endDateTime: scheduledTime,
                                                timeZone: "W. Europe Standard Time",
                                                occurrences: 1,
                                                endType: "Occurrences",
                                                frequency: "Daily",
                                                recurrencePattern: "Interval",
                                                interval: 1
                                            },
                                            interactionCount: 1,
                                            isVisibleInPicker: false,
                                            isPlatformObject: false,
                                            category: "Audience",
                                            publishedInteractionCount: 1,
                                            automationId: automationId,
                                            disableDEDataLogging: false
                                        }

                                    } else {

                                        var entryType = 'Run Once';
                                        var edk = 'DEAudience-' + GUID();
                                        var urlSetEntryEvent = restURL + '/interaction/v1/eventDefinitions/';
                                        var entryEventPayload = {
                                            type: "EmailAudience",
                                            name: journeyName,
                                            description: "",
                                            mode: "Production",
                                            eventDefinitionKey: edk,
                                            dataExtensionId: deId,
                                            dataExtensionName: deName,
                                            sourceApplicationExtensionId: sourceApplicationExtensionId,
                                            filterDefinitionId: "00000000-0000-0000-0000-000000000000",
                                            filterDefinitionTemplate: "",
                                            iconUrl: "/images/icon-data-extension.svg",
                                            arguments: {
                                                serializedObjectType: 3,
                                                serializedObjectType: 3,
                                                eventDefinitionKey: edk,
                                                dataExtensionId: deId,
                                                criteria: "",
                                                useHighWatermark: false,
                                                automationId: automationId
                                            },
                                            configurationArguments: {
                                                unconfigured: false
                                            },
                                            metaData: {
                                                criteriaDescription: "",
                                                scheduleFlowMode: "runOnce",
                                                runOnceScheduleMode: "onPublish",
                                                scheduleState: "No Schedule"
                                            },
                                            interactionCount: 1,
                                            isVisibleInPicker: false,
                                            isPlatformObject: false,
                                            category: "Audience",
                                            publishedInteractionCount: 1,
                                            automationId: automationId,
                                            disableDEDataLogging: false
                                        }
                                    }

                                var setEntryResp = sendRequest('POST',urlSetEntryEvent,entryEventPayload);
                                var setEntryRespJSON = Platform.Function.ParseJSON(String(setEntryResp.content));
                                var oldEntryEDK = entryEDK;
                                entryEDI = setEntryRespJSON.id;
                                entryEDK = setEntryRespJSON.eventDefinitionKey;
                                defaultEmail = defaultEmail.replace(oldEntryEDK, entryEDK);

                                journeyResponse.entryType = entryType;
                                journeyResponse.entryResp = setEntryResp.content;
                                journeyResponse.newEventDefinitionId = entryEDI;
                                journeyResponse.newEventDefinitionKey = entryEDK;
                                journeyResponse.newdefaultEmail = defaultEmail;
                                journeyResponse.deId = deId;
                                journeyResponse.deName = deName;
                                journeyResponse.sourceApplicationExtensionId = sourceApplicationExtensionId;
                                journeyResponse.automationId = automationId;

                                if (setEntryResp.statusCode == 200 || setEntryResp.statusCode == 201) {

                                    setStatus('200','Entry Event created'); 
                                    // Create new Journey Version

                                    var urlJourneyCreate = restURL + '/interaction/v1/interactions';
                                    var payloadCreateJourney = {
                                        key: journeyKey,
                                        name: journeyName,
                                        description: "",
                                        workflowApiVersion: 1,
                                        activities: 
                                            [{
                                                key: "EMAILV2-1",
                                                name: emailName,
                                                description: "",
                                                type: "EMAILV2",
                                                outcomes: [
                                                    {
                                                        key: "f75638f3-54c6-42da-b894-db4848a67f7d",
                                                        next: "WAITBYDURATION-5",
                                                        arguments: {},
                                                        metaData: {
                                                            invalid: false
                                                        }
                                                    }
                                                ],
                                                arguments: {
                                                    activityId: "{{Activity.Id}}",
                                                    definitionId: "{{Context.DefinitionId}}",
                                                    emailSubjectDataBound: nlSubject,
                                                    contactId: "{{Contact.Id}}",
                                                    contactKey: "{{Contact.Key}}",
                                                    emailAddress: "{{InteractionDefaults.Email}}",
                                                    sourceCustomObjectId: "{{Contact.AddressInfo.Email.SourceCustomObjectId}}",
                                                    sourceCustomObjectKey: "{{Contact.AddressInfo.Email.SourceCustomObjectKey}}",
                                                    fieldType: "{{Contact.AddressInfo.Email.FieldType}}",
                                                    eventData: "{{Event}}",
                                                    obfuscationProperties: "{{InteractionDefaults.Email.ObfuscationProperties}}",
                                                    customObjectKey: "",
                                                    definitionInstanceId: "{{Context.DefinitionInstanceId}}"
                                                },
                                                configurationArguments: {
                                                    triggeredSend: {
                                                        autoAddSubscribers: true,
                                                        autoUpdateSubscribers: true,
                                                        bccEmail: "",
                                                        ccEmail: "",
                                                        created: {},
                                                        domainExclusions: [],
                                                        dynamicEmailSubject: nlSubject,
                                                        emailId: emailId,
                                                        emailSubject: nlSubject,
                                                        preHeader: nlPreHeader,
                                                        exclusionFilter: "",
                                                        isSalesforceTracking: true,
                                                        isMultipart: true,
                                                        isSendLogging: true,
                                                        isStoppedOnJobError: false,
                                                        modified: {},
                                                        priority: 4,
                                                        sendClassificationId: nlSendClassification,
                                                        throttleOpens: "1/1/0001 12:00:00 AM",
                                                        throttleCloses: "1/1/0001 12:00:00 AM",
                                                        deliveryProfileId: nlDeliveryProfile,
                                                        senderProfileId: nlSenderProfile,
                                                        isTrackingClicks: true,
                                                        publicationListId: 732
                                                    },
                                                    applicationExtensionKey: "jb-email-activity",
                                                    isModified: false,
                                                    isSimulation: false,
                                                    googleAnalyticsCampaignName: "",
                                                    useLLTS: false,
                                                    fuelAgentRequested: false
                                                },
                                                metaData: {
                                                    icon: "https://jb-email-activity.s10.marketingcloudapps.com/img/email-icon.svg",
                                                    iconSmall: "https://jb-email-activity.s10.marketingcloudapps.com/img/email-icon.svg",
                                                    category: "message",
                                                    version: "1.0",
                                                    statsContactIcon: "",
                                                    original_icon: "/img/email-icon.svg",
                                                    original_iconSmall: "/img/email-icon.svg",
                                                    sections: {},
                                                    isConfigured: true
                                                },
                                                schema: {
                                                    arguments: {
                                                        requestID: {
                                                            dataType: "Text",
                                                            isNullable: true,
                                                            direction: "Out",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        messageKey: {
                                                            dataType: "Text",
                                                            isNullable: true,
                                                            direction: "Out",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        activityId: {
                                                            dataType: "Text",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        definitionId: {
                                                            dataType: "Text",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: true,
                                                            access: "Hidden"
                                                        },
                                                        emailSubjectDataBound: {
                                                            dataType: "Text",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: true,
                                                            access: "Hidden"
                                                        },
                                                        contactId: {
                                                            dataType: "Number",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        contactKey: {
                                                            dataType: "Text",
                                                            isNullable: false,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        emailAddress: {
                                                            dataType: "Text",
                                                            isNullable: false,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        sourceCustomObjectId: {
                                                            dataType: "Text",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        sourceCustomObjectKey: {
                                                            dataType: "LongNumber",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        fieldType: {
                                                            dataType: "Text",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        eventData: {
                                                            dataType: "Text",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        obfuscationProperties: {
                                                            dataType: "Text",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        customObjectKey: {
                                                            dataType: "LongNumber",
                                                            isNullable: true,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        },
                                                        definitionInstanceId: {
                                                            dataType: "Text",
                                                            isNullable: false,
                                                            direction: "In",
                                                            readOnly: false,
                                                            access: "Hidden"
                                                        }
                                                    }
                                                }
                                            },
                                                {
                                                    key: "WAITBYDURATION-5",
                                                    name: "1 hour",
                                                    description: "",
                                                    type: "WAIT",
                                                    outcomes: [{
                                                        key: "3f104670-3218-46d0-be96-348c48512f91",
                                                        arguments: {},
                                                        metaData: {}
                                                    }],
                                                    arguments: {
                                                        waitEndDateAttributeDataBound: "",
                                                        waitDefinitionId: "",
                                                        waitForEventId: "",
                                                        executionMode: "{{Context.ExecutionMode}}",
                                                        startActivityKey: "{{Context.StartActivityKey}}",
                                                        waitQueueId: "{{Context.WaitQueueId}}"
                                                    },
                                                    configurationArguments: {
                                                        waitDuration: 1,
                                                        waitUnit: "HOURS",
                                                        specifiedTime: "00:00",
                                                        timeZone: "W. Europe Standard Time",
                                                        description: "",
                                                        waitEndDateAttributeExpression: "",
                                                        specificDate: "",
                                                        waitForEventKey: ""
                                                    },
                                                    metaData: {
                                                        isConfigured: true,
                                                        isExtended: false,
                                                        waitType: "duration",
                                                        guidanceCardKey: "",
                                                        uiType: "WAITBYDURATION"
                                                    },
                                                    schema: {
                                                        arguments: {
                                                            endDate: {
                                                                dataType: "Date",
                                                                isNullable: false,
                                                                direction: "Out",
                                                                readOnly: false,
                                                                access: "Hidden"
                                                            },
                                                            waitEndDateAttributeDataBound: {
                                                                dataType: "Text",
                                                                isNullable: true,
                                                                direction: "In",
                                                                readOnly: false,
                                                                access: "Hidden"
                                                            },
                                                            waitDefinitionId: {
                                                                dataType: "Text",
                                                                isNullable: false,
                                                                direction: "In",
                                                                readOnly: false,
                                                                access: "Hidden"
                                                            },
                                                            waitForEventId: {
                                                                dataType: "Text",
                                                                isNullable: true,
                                                                direction: "In",
                                                                readOnly: false,
                                                                access: "Hidden"
                                                            },
                                                            executionMode: {
                                                                dataType: "Text",
                                                                isNullable: false,
                                                                direction: "In",
                                                                readOnly: false,
                                                                access: "Hidden"
                                                            },
                                                            startActivityKey: {
                                                                dataType: "Text",
                                                                isNullable: true,
                                                                direction: "In",
                                                                readOnly: false,
                                                                access: "Hidden"
                                                            },
                                                            waitQueueId: {
                                                                dataType: "LongNumber",
                                                                isNullable: true,
                                                                direction: "In",
                                                                readOnly: false,
                                                                access: "Hidden"
                                                            }
                                                        }
                                                    }
                                                }
                                            ],
                                            triggers: [{
                                                id: triggerId,
                                                key: "TRIGGER",
                                                name: "TRIGGER",
                                                description: "",
                                                type: "EmailAudience",
                                                outcomes: [],
                                                arguments: {
                                                    startActivityKey: "{{Context.StartActivityKey}}",
                                                    dequeueReason: "{{Context.DequeueReason}}",
                                                    lastExecutedActivityKey: "{{Context.LastExecutedActivityKey}}",
                                                    filterResult: "true"
                                                },
                                                configurationArguments: {
                                                    schemaVersionId: 0,
                                                    criteria: "",
                                                    filterDefinitionId: "00000000-0000-0000-0000-000000000000"
                                                },
                                                metaData: {
                                                    eventDefinitionId: entryEDI,
                                                    eventDefinitionKey: entryEDK,
                                                    chainType: "None",
                                                    configurationRequired: false,
                                                    iconUrl: "/images/icon-data-extension.svg",
                                                    title: "Data Extension",
                                                    entrySourceGroupConfigUrl: "jb:///data/entry/audience/entrysourcegroupconfig.json",
                                                    sourceInteractionId: "00000000-0000-0000-0000-000000000000"
                                                }
                                            }],
                                            goals: [],
                                            exits: [],
                                            stats: {
                                                currentPopulation: 0,
                                                cumulativePopulation: 0,
                                                metGoal: 0,
                                                metExitCriteria: 0,
                                                goalPerformance: 0
                                            },
                                            entryMode: "SingleEntryAcrossAllVersions",
                                            definitionType: "Multistep",
                                            channel: "",
                                            defaults: {
                                                email: [
                                                    defaultEmail
                                                ],
                                                properties: {
                                                    analyticsTracking: {
                                                        enabled: false,
                                                        analyticsType: "google",
                                                        urlDomainsToTrack: []
                                                    }
                                                }
                                            },
                                            metaData: {},
                                            executionMode: "Production",
                                            categoryId: journeyFolderId,
                                            status: "Draft",
                                            scheduledStatus: "None"
                                    }
                                    
                                    journeyResponse.createPayload = payloadCreateJourney;
                                    responseJSON.journeypayload = journeyResponse;
                                    var journeyCreateResp = sendRequest('POST', urlJourneyCreate, payloadCreateJourney)
                                    var journeyCreateRespJSON = Platform.Function.ParseJSON(String(journeyCreateResp.content));

                                    journeyResponse.createStatus = journeyCreateResp.statusCode;
                                    journeyResponse.createPayload = payloadCreateJourney;

                                    if (journeyCreateResp.statusCode == '200' ) {

                                        setStatus('200','New journey version created'); 

                                        if (journeyStatus == 'Published') {
                                            // Stop previous Version 
                                            var urlJourneyStop = restURL + '/interaction/v1/interactions/stop/' + journeyId + '?versionNumber=' + oldJourneyVersion;

                                            var journeyStopResp = sendRequest('POST', urlJourneyStop)
                                            var journeyStopRespJSON = Platform.Function.ParseJSON(String(journeyStopResp.content));

                                        } else if (journeyStatus == 'Draft') {
                                            // Delete previous Version 
                                            var urlJourneyStop = restURL + '/interaction/v1/interactions/' + journeyId + '?versionNumber=' + oldJourneyVersion;

                                            var journeyStopResp = sendRequest('DELETE', urlJourneyStop)
                                            var journeyStopRespJSON = Platform.Function.ParseJSON(String(journeyStopResp.content));

                                        }
                                        
                                        journeyResponse.stopStatus = journeyStopResp.statusCode;  

                                        if (journeyStopResp.statusCode == 200 || journeyStopResp.statusCode == 202 || journeyStatus == 'Stopped') {

                                            setStatus('200','Old journey Version stopped'); 
                                            // Get new Version
                                            var urlNewJourneyGet = restURL + '/interaction/v1/interactions?name=' + journeyName;

                                            var newJourneyCreateResp = sendRequest('GET', urlNewJourneyGet)
                                            var newJourneyCreateRespJSON = Platform.Function.ParseJSON(String(newJourneyCreateResp.content));
                                            
                                            journeyId = newJourneyCreateRespJSON.items[0].id;
                                            journeyVersion = newJourneyCreateRespJSON.items[0].version;
                                            journeyKey = newJourneyCreateRespJSON.items[0].key;

                                            journeyResponse.newId = journeyId;
                                            journeyResponse.newKey = journeyKey;
                                            journeyResponse.newVersion = journeyVersion;
                                            journeyResponse.getStatus = newJourneyCreateResp.statusCode;

                                            if (newJourneyCreateResp.statusCode == 200) {
                                                
                                                setStatus('200','New Journey found'); 
                                                // Activate Journey
                                                var urlJourneyStart = restURL + '/interaction/v1/interactions/publishAsync/' + journeyId + '?versionNumber=' + journeyVersion;
 
                                                var journeyStartResp = sendRequest('POST', urlJourneyStart)
                                                var journeyStartRespJSON = Platform.Function.ParseJSON(String(journeyStartResp.content));

                                                journeyResponse.activationStatus = journeyStartResp.statusCode;

                                                // Journey Start Status
                                                var urlJourneyStartStatus = restURL + journeyStartRespJSON.statusUrl;

                                                var journeyStartStatusResp = sendRequest('GET', urlJourneyStartStatus);
                                                var journeyStartStatusRespJSON = Platform.Function.ParseJSON(String(journeyStartStatusResp.content));

                                                if (journeyStartStatusRespJSON.status != 'PublishInProcess') {
                                                    setStatus('400','Journey Activation failed'); 
                                                } else {
                                                    setStatus('200','Journey Activation in Progress'); 
                                                }

                                                journeyResponse.activationMessage = journeyStartStatusResp.content;
                                                responseJSON.journeynEW = journeyResponse;

                                                // Create & save preview HTML
                                                
                                                var previewUrl = restURL + '/guide/v1/emails/' + emailId + '/dataExtension/key:previewSubscriber/contacts/key:preview@rumble.de/preview?kind=html';
                                                var previewResp = sendRequest("POST", previewUrl);
                                                var previewRespJSON = Platform.Function.ParseJSON(String(previewResp.content));
                                                var previewHTML = previewRespJSON.message.views[0].content;
                                                if (previewResp.statusCode == 200 || previewResp.statusCode == 201) {
                                                    var previewLog = Platform.Function.InsertData("PreviewLog",["Date","Newsletter","HTML"],[timestamp,newsletterLogName,previewHTML]);
                                                    //var sentLogRNC = Platform.Function.InsertData("SentLogRNC",["UNLId","Newsletter","HTML"],[UNLId,newsletterLogName,previewHTML]);
                                                    responseJSON.statusCode = '200';
                                                    responseJSON.statusMessage = 'Preview created.';
                                                    emailResponse.previewStatus = previewResp.statusCode;
                                                    emailResponse.previewHTML = previewHTML;  
                                                } else {
                                                    responseJSON.statusCode = '400';
                                                    responseJSON.statusMessage = 'Preview failed.';
                                                    emailResponse.previewStatus = previewResp.statusCode;
                                                    setStatus('400','Preview failed',previewResp.content);
                                                } 

                                            } else {
                                                journeyResponse.statusCode = '400';
                                                journeyResponse.statusMessage = 'Activating journey failed';
                                                journeyResponse.errorResponse = journeyStartStatusRespJSON.content;
                                                setStatus('400','Activating journey failed',journeyStartStatusRespJSON.content);
                                            }                                       
                                            
                                        } else {
                                            journeyResponse.statusCode = '400';
                                            journeyResponse.statusMessage = 'Stopping journey failed';
                                            journeyResponse.errorResponse = journeyStopResp.content;
                                            setStatus('400','Stopping journey failed', journeyStopResp.content);
                                        }                                    
                                        
                                    } else {
                                        journeyResponse.statusCode = '400';
                                        journeyResponse.statusMessage = 'No new version created';
                                        journeyResponse.errorResponse = journeyCreateResp.content;
                                        setStatus('400','No new journey version created',journeyCreateResp.content);
                                    }

                                } else {
                                    journeyResponse.statusCode = '400';
                                    journeyResponse.statusMessage = 'No entry event created';
                                    journeyResponse.errorResponse = setEntryResp.content;
                                    setStatus('400','No entry event created',setEntryResp.content);
                                }
                            
                            } else {
                                journeyResponse.statusCode = '400';
                                journeyResponse.statusMessage = 'No journey found';
                                journeyResponse.errorResponse = journeyGetResp.content;
                                setStatus('400','No journey found',journeyGetResp.content);
                            }
                        } 
                    } else if (mode == 'send') {
                        journeyResponse.statusCode = '400';
                        journeyResponse.statusMessage = 'No email found';
                        setStatus('400','No email found');                   
                    }  

                } else {
                    setStatus('400','Newsletter not found');
                }         

            } else {
                setStatus('400','Authentication failed', accessTokenResult.Response[0]);
            }

 
            function sendRequest(method, url, payload) {

                var contentType = 'application/json;charSET=utf-8';
                var Authorization = 'Bearer ' + accessToken;

                var req = new Script.Util.HttpRequest(url);
                req.emptyContentHandling = 0;
                req.retries = 1;
                req.continueOnError = false;
                req.contentType = contentType;
                req.setHeader("Authorization", Authorization);
                req.method = method;
                if(method == 'POST') {
                    req.postData = Stringify(payload);
                }             
                var resp = req.send();
                //Write('<br><br>' + url + ' ' + method + ' ' + Stringify(payload) + ' ' + resp.statusCode);
    
                return resp;
            }

            function createContentBlock(contentBlock, templateName, assetType, replacementJSON, location, emailType) {
                var contentBlockJSON = {};

                templateName = dev == false ? templateName : 'DEV_' + templateName;
                if (assetType != assetTypeReferenceBlock) {
                    var html = Platform.Function.ContentBlockByKey(templateName);
                    for (var j = 0; j < replacementJSON.replacements.length ; j++) {
                            //while (html.indexOf('ARTICLE_URL') > -1) {
                                html = replaceAll(html, replacementJSON.replacements[j].name, replacementJSON.replacements[j].value); 
                                // Write('Replacements ' + replacementJSON.replacements[j].name + ': ' + replacementJSON.replacements[j].value + ' HTML: ' +html + '<br>');    
                        // }
                    }
                } else {
                    var html = '%' + '%=ContentBlockbyKey(\"' + templateName + '")=%' + '%'
                }
                
                contentBlockJSON.content = html;
                contentBlockJSON.assetType = assetType;
                emailPayload.views.html.slots[location].blocks[contentBlock] = contentBlockJSON; 
                emailPayload.views.html.slots[location].content +=  "<div data-type=\"block\" data-key=\""+ contentBlock + "\"></div>";
            }

            function setStatus (statusCode, statusMessage, responseError) {
                responseJSON.statusCode = statusCode;
                responseJSON.statusMessage = statusMessage;
                if (responseError) {
                    responseJSON.statusError = responseError;
                }
            }

            function getTimestamp(timestamp) {
                var dt = new Date(timestamp);
                dt = DateTime.SystemDateToLocalDate(dt);
                var h = dt.getHours();
                var m = dt.getMinutes();
                var s = dt.getSeconds();
                if(h<10) h = '0'+h;
                if(m<10) m = '0'+m;
                if(s<10) s = '0'+s;

                var ts = dt.getDate() + '.' + (dt.getMonth()+1) + '.' + dt.getFullYear() + ', ' + h + ':' + m + ' Uhr';

                return ts;
            }

            function replaceAll(input, placeholder, content) {
                var result = input;
                var inputOriginal = "";
                while (inputOriginal != result) {
                    inputOriginal = result;
                    result = result.replace(placeholder, content);
                }
                return result;
            }

            
            
            timeJSON.end = new Date().getTime();
            responseJSON.timings = timeJSON;
            responseJSON.journey = journeyResponse;
            Write(Stringify(responseJSON));
            var scriptLog = Platform.Function.InsertData("ScriptLog",["Date","Newsletter","mode","IP","Response"],[timestamp,newsletterLogName,mode,ip,Stringify(responseJSON)]);

        } catch (e) {
            responseJSON.statusCode = '400';
            responseJSON.statusMessage = Stringify(e);
            responseJSON.timings = timeJSON;
            responseJSON.journeycheck = journeyResponse;

            Write(stringify(responseJSON));
            var scriptLog = Platform.Function.InsertData("ScriptLog",["Date","Newsletter","mode","IP","Response"],[timestamp,newsletterLogName,mode,ip,Stringify(responseJSON)]);
  
        } 

    } else {
        responseJSON.statusCode = '400';
        responseJSON.statusMessage = 'Verbindung nicht authentifiziert.';
        Write(stringify(responseJSON));
        var scriptLog = Platform.Function.InsertData("ScriptLog",["Date","Newsletter","mode","IP","Response"],[timestamp,newsletterLogName,mode,ip,Stringify(responseJSON)]);
    }   
/* } catch (e) {
    responseJSON.statusCode = '401';
    responseJSON.statusMessage = Stringify(e);
    //responseJSON.timings = timeJSON;
    //responseJSON.journeycheck = journeyResponse;

    Write(stringify(responseJSON));
    //var scriptLog = Platform.Function.InsertData("ScriptLog",["Date","Newsletter","mode","IP","Response"],[timestamp,newsletterLogName,mode,ip,Stringify(responseJSON)]);
  
    } */
</script>