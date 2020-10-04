const puppeteer = require("puppeteer");
const login = require("./login");
const firebase = require("firebase-admin");
const serviceAccount = require("./credentials.json");
let arr = {};

(async () => {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: login.DATABASEURL,
  });

  const db = firebase.database();
  const ref = db.ref("data");

  ref.on("value", function (snapshot) {
    snapshot.forEach((el) => {
      const data = el.val();
      arr = data;
    });
  });

  setTimeout(createInvoices, 10000);
})();

async function createInvoices() {
  // Login
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(login.URL);

    await page.waitForSelector("#Email");

    // Elements
    const email = await page.$("#Email");
    const password = await page.$("#Password");
    const button = await page.$(".btnsubmit");

    // Login and Click
    await email.type(login.EMAIL);
    await page.waitFor(1000); // Should be deleted
    await password.type(login.PASSWORD);
    await page.waitFor(1000); // Should be deleted
    await button.click();
  } catch {
    console.error("Login failed");
  }

  // Create new invoice
  for (let user of arr.customerDetails) {
    await page.waitForTimeout(3000);
    await page.waitForSelector("#btn_new_invoice");
    const createInv = await page.$("#btn_new_invoice");
    await page.waitForTimeout(2000);
    await createInv.click();

    // Type Client name
    await page.waitForTimeout(2000);
    await page.waitForSelector("#txtClientSearch");
    const clientInput = await page.$("#txtClientSearch");
    await clientInput.click();
    await clientInput.type(user.name); // comes from the database
    await page.waitForTimeout(1000);

    //Select person from drop down
    if ((await page.$(".ui-menu-item")) !== null) {
      const selectClient = await page.$(".ui-menu-item");
      await selectClient.click();

      // Select Description
      const description = await page.$$(".focusDescription");
      const unit = await page.$$(".unitCostInput");
      const qty = await page.$$(".qtyInput");
      const saveBtn = await page.$(".imgsaveInvoiceDetails");
      const productId = await page.$$(".lineItemInput");

      productId[0].type(user.itemNum);
      await page.waitForTimeout(500);
      description[0].type(user.productName); // comes from database
      await page.waitForTimeout(500);
      unit[0].type(
        (
          Number.parseFloat(user.price) / Number.parseFloat(user.quantity)
        ).toString()
      );
      await page.waitForTimeout(500);
      qty[0].type(user.quantity);
      await page.waitForTimeout(500);
      await saveBtn.click();
      await page.waitForTimeout(500);

      //Back
      await page.waitForTimeout(2000);
      const backBtn = await page.$(".navAwayHref");
      await backBtn.click();

      // Click new button if dropdown does not exist
    } else if ((await page.$(".ui-menu-item")) === null) {
      const newBtn = await page.$("#divCreateNewClient");
      await newBtn.click();

      // Client Name
      await page.waitForSelector("#TextBox3");
      const clientName = await page.$("#TextBox3");
      await clientName.type(user.name);
      await page.waitForTimeout(500);

      // Address
      const address = await page.$("#TextBox4");
      await address.type(user.street);
      await page.waitForTimeout(500);

      // if we have 2nd address line
      const secondAddress = await page.$("#TextBox5");
      await secondAddress.type(user.county);
      await page.waitForTimeout(500);

      // PostCode
      const postCode = await page.$("#TextBox8");
      await postCode.type(user.zip);
      await page.waitForTimeout(500);

      // Save Client
      const saveClient = await page.$(".clientSaveButton");
      saveClient.click();

      // Select Description
      const desCription = await page.$$(".focusDescription");
      const unit = await page.$$(".unitCostInput");
      const qty = await page.$$(".qtyInput");
      const saveBtn = await page.$(".imgsaveInvoiceDetails");
      const productId = await page.$$(".lineItemInput");

      productId[0].type(user.itemNum);
      await page.waitForTimeout(500);
      desCription[0].type(user.productName); // comes from database
      await page.waitForTimeout(500);
      unit[0].type(
        (
          Number.parseFloat(user.price) / Number.parseFloat(user.quantity)
        ).toString()
      );
      await page.waitForTimeout(500);
      qty[0].type(user.quantity);
      await page.waitForTimeout(500);
      await saveBtn.click();
      await page.waitForTimeout(500);

      //Back
      const backBtn = await page.$(".navAwayHref");
      await page.waitForTimeout(1000);
      await backBtn.click();
      await page.waitForTimeout(2000);
    }
  }
  await browser.close();
}
