// Запускать на странице: https://www.avito.ru/user/4eae2bc42460589c3ae106d8b26fe866/profile
// Сначала прокрути страницу до конца!
(function() {
  var items = [
  {
    "id": "9afc829f-e257-4fa8-8576-def62f3cd7c7",
    "avitoId": "8005882291",
    "label": "Duran Duran — Decade"
  },
  {
    "id": "fa1ae34e-0c17-468c-b795-0ad8d69d1bc0",
    "avitoId": "8005787881",
    "label": "David Bowie — Scary Monsters"
  },
  {
    "id": "effce94a-5a2e-4cbd-9ddf-3285b73c92d1",
    "avitoId": "8005654608",
    "label": "The Cure — Never Enough"
  },
  {
    "id": "4ccc217b-7242-463a-91d8-dce5af31af1b",
    "avitoId": "8005586319",
    "label": "Simple Minds — Street Fighting Years"
  },
  {
    "id": "eb3249c8-033e-4a0b-bdcb-1a4b98b62117",
    "avitoId": "8005578366",
    "label": "ELO — Part 2"
  },
  {
    "id": "397fde65-70c8-42b3-8f36-36e145462eb6",
    "avitoId": "8005025170",
    "label": "Simple Minds — Once Upon A Time"
  },
  {
    "id": "06e5cb12-5b3f-4ea5-b17b-589c68723ed3",
    "avitoId": "8005017460",
    "label": "New Order — Republic"
  },
  {
    "id": "4a64a979-abf5-40d9-b253-b0a6d5e24433",
    "avitoId": "8005001847",
    "label": "Simple Minds — Live In The City Of Light"
  },
  {
    "id": "34973b23-0d51-45a3-9bf9-cd86873d53e0",
    "avitoId": "8004982576",
    "label": "New Order — Regret"
  },
  {
    "id": "ac617158-190e-4cb7-9702-1dcf4bc610cb",
    "avitoId": "7973078838",
    "label": "The Mission — Carved In Sand"
  },
  {
    "id": "b3839cee-82ee-4a36-ae4e-d85d4b25beee",
    "avitoId": "7909696603",
    "label": " — Аудиокассеты Michael Jackson"
  },
  {
    "id": "6271fe7b-d315-4fff-8c2a-4b8d8bf2af1a",
    "avitoId": "7909644432",
    "label": "The Jesus And Mary Chain — Automatic"
  },
  {
    "id": "534c9d65-b335-4a8c-8685-66ade274a2df",
    "avitoId": "7909227426",
    "label": "R.E.M. — Monster"
  },
  {
    "id": "92468a12-e55a-4838-882c-94a43510eae0",
    "avitoId": "7909023163",
    "label": "Sting — The Dream Of The Blue Turtles"
  },
  {
    "id": "807eac9a-27a3-43de-8161-450e43629fe5",
    "avitoId": "7908933257",
    "label": "Lou Reed — Retro"
  },
  {
    "id": "5dc1b309-7f8f-4a5c-ba9e-7eb0925d703c",
    "avitoId": "7813778628",
    "label": "Echo & The Bunnymen — The Cutter"
  },
  {
    "id": "002aa056-8cd9-4f3a-8a31-3ec28b77a382",
    "avitoId": "7813628031",
    "label": "The Police — Zenyatta Mondatta"
  },
  {
    "id": "299437cc-6f3b-4501-8e1d-8aa79b8c4420",
    "avitoId": "7685833875",
    "label": " — James Bond For Your Eyes Only 007"
  },
  {
    "id": "18890709-4c95-4367-94b5-bbd35fafe99f",
    "avitoId": "7621690604",
    "label": " — Billie Holiday Volume II"
  },
  {
    "id": "b6432cbd-8c18-4e94-9109-83f2e1e7440e",
    "avitoId": "7621630467",
    "label": "Billie Holiday — Live"
  },
  {
    "id": "9ab4a4c5-2870-438d-b48e-4b9086f42fa0",
    "avitoId": "7621036376",
    "label": " — Disco Shine 12 original disco hits"
  },
  {
    "id": "c1740d02-916f-4eea-bed8-f71cbb4100c2",
    "avitoId": "8004929513",
    "label": "Talking Heads — Stop Making Sense"
  },
  {
    "id": "56e6d8ee-96f6-4268-a667-3730a4d05188",
    "avitoId": "7909899791",
    "label": "R.E.M. — New Adventures In Hi-Fi"
  },
  {
    "id": "05eabf92-82f4-4cb9-a2a5-2b75d27cd529",
    "avitoId": "7909216742",
    "label": "Genesis — Invisible Touch"
  },
  {
    "id": "36752b2e-5fc7-4a4a-8ac8-1b4c1dcf4118",
    "avitoId": "7813831539",
    "label": "R.E.M. — Automatic For The People"
  },
  {
    "id": "48676cb1-39ac-4e5d-afe8-1b882e73a1be",
    "avitoId": "7685155852",
    "label": " — Motown Chartbusters Vol. 3"
  },
  {
    "id": "67ea6a8b-b009-4bf0-9004-c0d266e4af14",
    "avitoId": "7621115066",
    "label": "John Lennon — Imagine (2 кассеты, 1988 EMI)"
  }
];

  // Строим словарь: avitoId -> { id, label }
  var lookup = {};
  for (var i = 0; i < items.length; i++) {
    lookup[items[i].avitoId] = { id: items[i].id, label: items[i].label };
  }

  // Ищем все <a href> — находим ссылки на наши объявления по числовому ID
  var allLinks = document.querySelectorAll("a[href]");
  var cardMap = {};
  for (var j = 0; j < allLinks.length; j++) {
    var href = allLinks[j].getAttribute("href") || "";
    var idMatch = href.match(/_([0-9]+)(?:[?#]|$)/);
    if (!idMatch) continue;
    var avitoId = idMatch[1];
    if (!lookup[avitoId] || cardMap[avitoId]) continue;
    // Поднимаемся по DOM, пока не найдём элемент с <img>
    var el = allLinks[j];
    for (var k = 0; k < 10; k++) {
      if (!el.parentElement) break;
      el = el.parentElement;
      if (el.querySelector("img")) break;
    }
    cardMap[avitoId] = el;
  }
  console.log("Найдено ссылок на наши кассеты: " + Object.keys(cardMap).length);

  var results = [];
  var found = 0;

  for (var aid in cardMap) {
    var entry = lookup[aid];
    var card = cardMap[aid];

    // Первая картинка в карточке
    var imgEl = card.querySelector("img");
    var imgSrc = null;
    if (imgEl) {
      imgSrc = imgEl.src || imgEl.getAttribute("data-src") || null;
      // Поднимаем разрешение с thumbnail до нормального
      if (imgSrc) imgSrc = imgSrc.replace(/\/[0-9]+x[0-9]+\//, "/640x480/");
    }

    results.push({ id: entry.id, img: imgSrc });
    found++;
    console.log("[" + found + "] " + (imgSrc ? "OK" : "NO IMG") + " — " + entry.label);
  }

  console.log("\nИтого: " + found + " из " + items.length + " кассет");

  if (results.length === 0) {
    console.error("Ничего не найдено. Убедись что ты на странице продавца и прокрутил до конца.");
    return;
  }

  // Скачиваем JSON
  var blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "avito-images.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  console.log("Файл avito-images.json скачан!");
})();