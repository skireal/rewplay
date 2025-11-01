import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Инициализация Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Инициализация Telegram бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

console.log('🤖 Rewplay Telegram Bot запущен!');

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
    `🎵 *Добро пожаловать в Rewplay!*\n\n` +
    `Это бот для просмотра каталога винтажных аудиокассет.\n\n` +
    `Доступные команды:\n` +
    `/catalog - Показать каталог в наличии\n` +
    `/all - Показать весь каталог\n` +
    `/search [запрос] - Поиск по исполнителю или альбому\n` +
    `/stats - Статистика каталога\n` +
    `/help - Помощь`,
    { parse_mode: 'Markdown' }
  );
});

// Команда /catalog - показать кассеты в наличии
bot.onText(/\/catalog/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '⏳ Загружаю кассеты в наличии...');

  try {
    const { data, error } = await supabase
      .from('cassettes')
      .select('*')
      .eq('in_stock', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (data.length === 0) {
      bot.sendMessage(chatId, '😔 К сожалению, сейчас нет кассет в наличии.');
      return;
    }

    let message = `🎵 *Кассеты в наличии (${data.length})*\n\n`;

    data.forEach((cassette, index) => {
      message += `${index + 1}. *${cassette.artist}* - "${cassette.album}"\n`;
      message += `   💰 ${cassette.price} ₽`;
      if (cassette.year) message += ` | 📅 ${cassette.year}`;
      message += ` | 📦 ${cassette.quantity} шт\n`;
      if (cassette.genre) message += `   🎸 ${cassette.genre}\n`;
      message += `\n`;
    });

    message += `\nИспользуйте /search [название] для поиска конкретной кассеты`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, '❌ Ошибка при загрузке каталога. Попробуйте позже.');
  }
});

// Команда /all - показать весь каталог
bot.onText(/\/all/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '⏳ Загружаю весь каталог...');

  try {
    const { data, error } = await supabase
      .from('cassettes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) throw error;

    if (data.length === 0) {
      bot.sendMessage(chatId, '😔 Каталог пуст.');
      return;
    }

    let message = `📚 *Весь каталог (показано ${data.length})*\n\n`;

    data.forEach((cassette, index) => {
      const status = cassette.in_stock ? '✅ В наличии' : '❌ Нет';

      message += `${index + 1}. *${cassette.artist}* - "${cassette.album}"\n`;
      message += `   ${status} | 💰 ${cassette.price} ₽`;
      if (cassette.year) message += ` | 📅 ${cassette.year}`;
      message += `\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, '❌ Ошибка при загрузке каталога.');
  }
});

// Команда /search - поиск
bot.onText(/\/search (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1].trim();

  bot.sendMessage(chatId, `🔍 Ищу "${query}"...`);

  try {
    const { data, error } = await supabase
      .from('cassettes')
      .select('*')
      .or(`artist.ilike.%${query}%,album.ilike.%${query}%`)
      .order('in_stock', { ascending: false });

    if (error) throw error;

    if (data.length === 0) {
      bot.sendMessage(chatId, `😔 Ничего не найдено по запросу "${query}"`);
      return;
    }

    let message = `🎯 *Найдено: ${data.length}*\n\n`;

    data.forEach((cassette, index) => {
      const status = cassette.in_stock ? '✅' : '❌';

      message += `${status} *${cassette.artist}* - "${cassette.album}"\n`;
      message += `   💰 ${cassette.price} ₽`;
      if (cassette.year) message += ` | 📅 ${cassette.year}`;
      if (cassette.in_stock) message += ` | 📦 ${cassette.quantity} шт`;
      message += `\n`;

      if (cassette.description) {
        message += `   📝 ${cassette.description.substring(0, 100)}...\n`;
      }

      // Добавляем ссылки на магазины
      if (cassette.shop_links) {
        const links = cassette.shop_links;
        let shopLinks = '   🛒 ';
        if (links.ozon) shopLinks += '[Ozon](${links.ozon}) ';
        if (links.wildberries) shopLinks += '[WB](${links.wildberries}) ';
        if (links.avito) shopLinks += '[Avito](${links.avito}) ';
        message += shopLinks + '\n';
      }

      message += `\n`;
    });

    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, '❌ Ошибка при поиске.');
  }
});

// Команда /stats - статистика
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const { data, error } = await supabase
      .from('catalog_stats')
      .select('*')
      .single();

    if (error) throw error;

    const message =
      `📊 *Статистика каталога*\n\n` +
      `📚 Всего кассет: ${data.total_cassettes}\n` +
      `✅ В наличии: ${data.in_stock_count}\n` +
      `📦 Общее количество: ${data.total_quantity} шт\n` +
      `💰 Средняя цена: ${Math.round(data.average_price)} ₽\n` +
      `💵 Мин. цена: ${data.min_price} ₽\n` +
      `💸 Макс. цена: ${data.max_price} ₽\n` +
      `🎤 Исполнителей: ${data.unique_artists}\n` +
      `🎸 Жанров: ${data.unique_genres}`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, '❌ Ошибка при загрузке статистики.');
  }
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
    `ℹ️ *Помощь*\n\n` +
    `*Доступные команды:*\n\n` +
    `/catalog - Показать кассеты в наличии\n` +
    `/all - Показать весь каталог\n` +
    `/search [запрос] - Поиск по названию или исполнителю\n` +
    `/stats - Статистика каталога\n\n` +
    `*Примеры поиска:*\n` +
    `/search Кино\n` +
    `/search Группа крови\n` +
    `/search рок\n\n` +
    `По вопросам покупки свяжитесь с администратором.`,
    { parse_mode: 'Markdown' }
  );
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});
