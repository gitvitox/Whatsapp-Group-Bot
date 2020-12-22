const playwright = require('playwright');
(async function start() {
    for (const browserType of ['chromium']) {
        const browser = await playwright[browserType].launch({
            args: ['--ignore-certificate-errors', '--no-sandbox', '--disable-setuid-sandbox'],
            headless: false,
            ignoreHTTPSErrors: true,
        });

        let response, currentPage;

        const context = await browser.newContext();

        await waitUntilLoggedIn();

        async function waitUntilLoggedIn() {
            await openWebsite("https://web.whatsapp.com/")
            await console.log("Waiting to Scan QR-Code...");
            await currentPage.waitForSelector("div._15OLJ", {timeout: 999999});
            await console.log("Logged in.");
            await currentPage.click("[title='test']");
            await console.log("Selected Group.")
            await scanMessages();
        }

        async function scanMessages() {
            let messages;
            // let numbers;
            // let names;
            await clearMessages();
            while (true) {
                messages = await currentPage.$$("div#main >> css=span.selectable-text");
                // numbers = await currentPage.$$("div#main >> css=span._1o4HO");
                // names = await currentPage.$$("div#main >> css=span._2KXjI");

                for await (let message of messages) {
                    let messageContent = await message.innerText();

                    console.log("[MESSAGE]: " + messageContent);
                    //onJoin Event
                    if (messageContent.includes("Einladungslink beigetreten")) {
                        let phoneNumber = messageContent.match(new RegExp("^(?=(?:\\D*\\d\\D*){8,14}$)[ -]*\\+?[ -]*(?:\\((?:[ -]*\\d)+[ -]*\\))?[- \\d]*"))[0].replace(/.$/, "");
                        await onJoin(messageContent, phoneNumber);
                    }

                    //onLeave Event
                    if (messageContent.includes("hat die Gruppe verlassen")) {
                        await onLeave();
                    }
                }
                await clearMessages();
                await wait(10000);
            }
        }

        async function openWebsite(url) {
            currentPage = await context.newPage();
            response = await currentPage.goto(url);
            await checkIfWebsiteIsReachable();
        }

        async function onJoin(messageContent, phoneNumber) {

            if (phoneNumber.includes("+1")) {
                await kickUser(phoneNumber);
                await writeMessage("Bot erkannt! Er wurde automatisch removed. (╯°□°）╯");
                return;
            }

            // await writeMessage("Herzlichen Willkommen in der Otaku-Gruppe :)!\n\n" +
            //     "Bitte stelle dich uns erst einmal mit deinem Namen, Alter und Lieblingsanime vor. " +
            //     "Du kannst bei Bedarf auch noch ein Bild von dir hinzufügen, das ist aber keine Pflicht! \n\n" +
            //     "Zu dem vermeide bitte unnötigen Smalltalk hier. Der kann in der Hauptgruppe geführt werden:).\n\n" +
            //     "Nachdem du dich vorgestellt hast, erhältst du einen Einladungslink in die Hauptgruppe. Viel Spaß bei uns:)!")
            await writeMessage("User joined");
        }

        async function onLeave() {
            await writeMessage("User Left");
        }

        async function kickUser(phoneNumber) {
            await openUserOptions();
            await currentPage.click("[title='"+phoneNumber+"']") /* Click on the User with the phonenumber */
            await currentPage.click("text='Entfernen'"); /* Press 'Entfernen' Button */
            await currentPage.click("[data-testid='x']"); /* Press 'X' Button from User List */
            await currentPage.click("[data-testid='x']"); /* Press 'X' Button from Group Settings */
        }

        async function openUserOptions() {
            await currentPage.click("div#main >> [data-testid='default-group']"); /* Click on the 3 dots to open Group Settings*/
            await currentPage.click("span._1TBWy >> [data-testid='search']"); /* Click on the Search Icon do open User List */
        }

        async function clearMessages() {
            await currentPage.waitForSelector("div#main >> [data-testid='menu']", {visible: true});
            await currentPage.click("div#main >> [data-testid='menu']"); /* Click on the settings button */

            await currentPage.waitForSelector("text='Nachrichten leeren'", {visible: true});
            await currentPage.click("text='Nachrichten leeren'"); /* Open the Clear message dialog */

            await currentPage.waitForSelector("text='Leeren'", {visible: true});
            await currentPage.click("text='Leeren'"); /* Clear messages */
        }

        async function writeMessage(message) {
            await currentPage.fill("xpath=//*[@id=\"main\"]/footer/div[1]/div[2]/div/div[2]", message);
            await currentPage.keyboard.press("Enter");
        }

        async function checkIfWebsiteIsReachable() {
            if (!response.ok()) {
                console.error("Error! Website returned a " + response.status() + " !");
                console.error("Expected URL: " + response.url());
                await restart();
            }
        }

        function wait(milleseconds) {
            return new Promise(resolve => setTimeout(resolve, milleseconds))
        }

        async function restart() {
            await console.log("Restarting!");
            await context.close();
            await browser.close();

            await setTimeout(async function f() {
                await start();
            }, 2000);
        }

    }
})();