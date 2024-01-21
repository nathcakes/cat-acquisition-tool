var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { chromium, devices } from "playwright";
import { writeFileSync, readFileSync } from "fs";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from "toad-scheduler";
import * as process from "process";
import * as os from 'os';
const readCatFile = () => {
    const file = readFileSync("/home/nate-pi/code/cat-acquisition-tool/cats.txt");
    return file.toString().split("\n");
};
const catScraper = () => __awaiter(void 0, void 0, void 0, function* () {
    const searchUrl = "https://www.adoptapet.com.au/search?animal_type=custom-mapping-2&state=6&location=0&breed=0&colour=0&sex=0&name=";
    const previousCats = readCatFile();
    const browser = yield chromium.launch({ headless: true });
    const browserContext = yield browser.newContext(devices["Desktop Chrome"]);
    const page = yield browserContext.newPage();
    const networkResults = os.networkInterfaces();
    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();
    if ((currentHour % 2 === 0) && (currentMin > 25) && (currentMin < 35)) {
        yield fetch('https://ntfy.sh/cat-error-reporter', {
            method: 'POST',
            body: `RaspberryPi Online @${networkResults.wlan0[0].address}`,
            headers: {
                'Title': 'Pi Online',
                'Tags': 'desktop_computer',
                'Priority': 'min'
            }
        });
    }
    page.route("**/*.{png,jpg,jpeg}", route => route.abort());
    yield page.goto(searchUrl);
    yield page.waitForTimeout(20000);
    const searchMore = page.getByText("Search more ");
    if (yield searchMore.isVisible()) {
        yield searchMore.click();
        yield page.waitForTimeout(20000);
    }
    const cats = page.locator("#pets");
    const data = [];
    const catContainers = yield cats.locator('[class="pet row-5"]').all();
    for (const cat of catContainers) {
        const href = yield cat.locator("a").getAttribute("href");
        if ((href === null) || (previousCats.includes(href)))
            continue;
        const catName = yield cat.locator("h3").innerText();
        const catBreed = yield cat.locator("p").innerText();
        yield fetch('https://ntfy.sh/rspcawa-cat-acquisition-tool', {
            method: 'POST',
            body: `${catName.split("-")[0]} is now available. The breed is ${catBreed}. Check this link: ${href}`,
            headers: {
                'Title': 'New cat found!',
                'Tags': 'heart_eyes_cat',
                'Priority': 'high'
            }
        });
        writeFileSync("/home/nate-pi/code/cat-acquisition-tool/cats.txt", href + "\n", { flag: "a" });
    }
    console.log(`Scrape completed ${new Date()}`);
    yield browser.close();
});
const scheduler = new ToadScheduler();
const task = new AsyncTask('cat scraping', catScraper, (err) => __awaiter(void 0, void 0, void 0, function* () {
    yield fetch('https://ntfy.sh/cat-error-reporter', {
        method: 'POST',
        body: `Error: ${err}`,
        headers: {
            'Title': 'Error in cat scraper!',
            'Tags': 'scream_cat',
            'Priority': 'high'
        }
    });
    console.log(err);
    scheduler.stop();
    process.exit(1);
}));
const job = new SimpleIntervalJob({ minutes: 5 }, task, { id: 'id_1', preventOverrun: true });
scheduler.addSimpleIntervalJob(job);
setInterval(() => { }, 1 << 30);
//# sourceMappingURL=index.js.map