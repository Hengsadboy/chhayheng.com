import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
import json
import os
import time
import qrcode
from io import BytesIO
import threading
import requests
import re
import uuid
from datetime import datetime

# Paths to the JSON database files shared with the Next.js app
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
SETTINGS_FILE = os.path.join(DB_DIR, 'settings.json')
PRODUCTS_FILE = os.path.join(DB_DIR, 'products.json')
TG_USERS_FILE = os.path.join(DB_DIR, 'tg_users.json')
COUPONS_FILE = os.path.join(DB_DIR, 'coupons.json')

def get_settings():
    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def get_coupons():
    try:
        with open(COUPONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def get_products():
    try:
        with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_products(products):
    with open(PRODUCTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2)

def get_tg_users():
    try:
        with open(TG_USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_tg_users(users):
    with open(TG_USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=2)

def get_user_balance(user_id):
    users = get_tg_users()
    uid_str = str(user_id)
    if uid_str not in users:
        return 0.0
    return users[uid_str].get('balance', 0.0)

def add_user_balance(user_id, amount):
    users = get_tg_users()
    uid_str = str(user_id)
    if uid_str not in users:
        users[uid_str] = {"balance": 0.0, "orders": []}
    users[uid_str]['balance'] = round(users[uid_str].get('balance', 0.0) + amount, 2)
    save_tg_users(users)
    return users[uid_str]['balance']

def deduct_user_balance(user_id, amount):
    users = get_tg_users()
    uid_str = str(user_id)
    if uid_str not in users:
        return False
    if users[uid_str].get('balance', 0.0) >= amount:
        users[uid_str]['balance'] = round(users[uid_str]['balance'] - amount, 2)
        save_tg_users(users)
        return True
    return False

def add_user_order(user_id, product_name, price, deliverable, is_service, requirements=None, product_id=None):
    users = get_tg_users()
    uid_str = str(user_id)
    if uid_str not in users:
        users[uid_str] = {"balance": 0.0, "orders": []}
    
    if "orders" not in users[uid_str]:
        users[uid_str]["orders"] = []
        
    order_id = str(uuid.uuid4())[:8]
    order = {
        "id": order_id,
        "product_name": product_name,
        "price": price,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "deliverable": deliverable,
        "is_service": is_service,
        "requirements": requirements
    }
    
    users[uid_str]["orders"].append(order)
    save_tg_users(users)

    # Sync order to data/orders.json for Admin Panel visibility
    try:
        orders_file = os.path.join(DB_DIR, 'orders.json')
        orders_list = []
        if os.path.exists(orders_file):
            with open(orders_file, 'r', encoding='utf-8') as f:
                orders_list = json.load(f)
        
        main_order = {
            "id": order_id,
            "customerEmail": f"Telegram: {user_id}",
            "productId": product_id or "tg",
            "productName": product_name,
            "price": price,
            "status": "Completed" if deliverable else "Pending",
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "deliverables": deliverable,
            "requirements": requirements
        }
        orders_list.insert(0, main_order)
        with open(orders_file, 'w', encoding='utf-8') as f:
            json.dump(orders_list, f, indent=2)
    except Exception as e:
        print(f"Failed to sync orders.json: {e}")

    return order_id

def get_user_orders(user_id):
    users = get_tg_users()
    uid_str = str(user_id)
    if uid_str not in users:
        return []
    return users[uid_str].get("orders", [])

settings = get_settings()
if not settings or not settings.get('botToken'):
    print("Bot Token not found in settings.json. Please configure it in the Admin Panel.")
    exit(1)

bot = telebot.TeleBot(settings['botToken'])

def build_main_menu():
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton("🛒 Products", callback_data="menu_categories"),
        InlineKeyboardButton("📦 My Orders", callback_data="menu_orders")
    )
    markup.row(
        InlineKeyboardButton("👤 My Account", callback_data="menu_account"),
        InlineKeyboardButton("💵 Deposit", callback_data="menu_deposit")
    )
    return markup

# Main Menu
@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.send_message(message.chat.id, "Welcome to our Store! What would you like to do?", reply_markup=build_main_menu())

# Handle Main Menu callbacks
@bot.callback_query_handler(func=lambda call: call.data.startswith('menu_'))
def handle_main_menu(call):
    if call.data == 'menu_main':
        bot.edit_message_text("Welcome back to the main menu! What would you like to do?", call.message.chat.id, call.message.message_id, reply_markup=build_main_menu())
        
    elif call.data == 'menu_orders':
        user_id = call.from_user.id
        orders = get_user_orders(user_id)
        
        if not orders:
            markup = InlineKeyboardMarkup()
            markup.row(InlineKeyboardButton("⬅️ Back to Menu", callback_data="menu_main"))
            bot.edit_message_text("📦 **My Orders**\n\nYou haven't purchased anything yet!", call.message.chat.id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')
            return
            
        markup = InlineKeyboardMarkup()
        markup.row_width = 1
        
        # Reverse to show newest first, limit to 10 for display
        for order in reversed(orders[-10:]):
            markup.add(InlineKeyboardButton(f"📦 {order['product_name']} ({order['date']})", callback_data=f"order_{order['id']}"))
            
        markup.add(InlineKeyboardButton("⬅️ Back to Menu", callback_data="menu_main"))
        bot.edit_message_text("📦 **My Orders**\n\nHere are your recent purchases. Click an order to view the details:", call.message.chat.id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')
        
    elif call.data == 'menu_account':
        user_id = call.from_user.id
        balance = get_user_balance(user_id)
        
        caption = f"👤 **My Account Profile**\n\n"
        caption += f"**Telegram ID:** `{user_id}`\n"
        caption += f"**Current Balance:** `${balance:.2f}`\n\n"
        caption += "You can use your balance to instantly purchase products in the store without scanning KHQR every time!"
        
        markup = InlineKeyboardMarkup()
        markup.row(InlineKeyboardButton("💵 Deposit Funds", callback_data="menu_deposit"))
        markup.row(InlineKeyboardButton("⬅️ Back to Menu", callback_data="menu_main"))
        
        bot.edit_message_text(caption, call.message.chat.id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')
        
    elif call.data == 'menu_deposit':
        caption = "💵 **Deposit Funds**\n\nPlease select an amount to deposit to your account balance:"
        
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton("$5", callback_data="deposit_5"),
            InlineKeyboardButton("$10", callback_data="deposit_10"),
            InlineKeyboardButton("$20", callback_data="deposit_20")
        )
        markup.row(
            InlineKeyboardButton("$50", callback_data="deposit_50"),
            InlineKeyboardButton("$100", callback_data="deposit_100")
        )
        markup.row(InlineKeyboardButton("✏️ Custom Amount", callback_data="deposit_custom"))
        markup.row(InlineKeyboardButton("⬅️ Back to Menu", callback_data="menu_main"))
        
        bot.edit_message_text(caption, call.message.chat.id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')

    elif call.data == 'menu_categories':
        products = get_products()
        categories = list(set([p.get('category', 'Uncategorized') for p in products]))
        
        markup = InlineKeyboardMarkup()
        markup.row_width = 1
        for cat in categories:
            markup.add(InlineKeyboardButton(f"📁 {cat}", callback_data=f"cat_{cat}"))
        
        markup.add(InlineKeyboardButton("⬅️ Back to Menu", callback_data="menu_main"))
        bot.edit_message_text("Please select a category:", call.message.chat.id, call.message.message_id, reply_markup=markup)

# Handle View Order
@bot.callback_query_handler(func=lambda call: call.data.startswith('order_'))
def handle_view_order(call):
    order_id = call.data.replace('order_', '')
    orders = get_user_orders(call.from_user.id)
    
    order = next((o for o in orders if o['id'] == order_id), None)
    if not order:
        bot.answer_callback_query(call.id, "Order not found.")
        return
        
    caption = f"📦 **Order Details**\n\n"
    caption += f"**Product:** {order['product_name']}\n"
    caption += f"**Date:** {order['date']}\n"
    caption += f"**Price:** ${order['price']}\n\n"
    
    if order.get('is_service'):
        caption += "**Status:** Service Request Logged. Our team will contact you shortly."
    else:
        caption += "**Your Product Key/Account:**\n"
        caption += f"`{order.get('deliverable', 'N/A')}`\n"
        
    markup = InlineKeyboardMarkup()
    markup.row(InlineKeyboardButton("⬅️ Back to Orders", callback_data="menu_orders"))
    
    bot.edit_message_text(caption, call.message.chat.id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')


# Handle Custom Deposit
@bot.callback_query_handler(func=lambda call: call.data == 'deposit_custom')
def handle_custom_deposit(call):
    bot.answer_callback_query(call.id)
    msg = bot.edit_message_text("💵 **Custom Deposit**\n\nPlease type the amount you want to deposit (Minimum: `$1.00`).\n\nExample: `2.50` or `15`", call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    bot.register_next_step_handler(msg, process_custom_deposit_input)

def process_custom_deposit_input(message):
    try:
        # Extract numbers from the user's message (e.g. "$5.00" -> 5.0)
        match = re.search(r'\d+(\.\d+)?', message.text)
        if not match:
            bot.send_message(message.chat.id, "❌ Invalid format. Please try again from the Deposit menu.")
            return
            
        amount = float(match.group())
        
        if amount < 1.0:
            bot.send_message(message.chat.id, "❌ Minimum deposit amount is $1.00. Please try again.")
            return
            
        bot.send_message(message.chat.id, f"Generating QR Code for `${amount:.2f}`...")
        process_payment_qr(message.chat.id, message.from_user.id, None, amount, is_deposit=True)
        
    except Exception as e:
        bot.send_message(message.chat.id, "❌ Error processing amount. Please try again.")


# Handle Category Selection
@bot.callback_query_handler(func=lambda call: call.data.startswith('cat_'))
def handle_category_selection(call):
    category_name = call.data.replace('cat_', '')
    products = get_products()
    
    cat_products = [p for p in products if p.get('category') == category_name]
    
    markup = InlineKeyboardMarkup()
    markup.row_width = 1
    
    for p in cat_products:
        is_service = any(k in p.get('category', '').lower() for k in ['bot', 'web', 'software'])
        stock_count = len(p.get('stockAccounts', []))
        
        btn_text = f"{p['name']} - ${p['price']}"
        if not is_service:
            if stock_count > 0:
                btn_text += f" ({stock_count} in stock)"
            else:
                btn_text += " (Out of stock)"
        
        markup.add(InlineKeyboardButton(btn_text, callback_data=f"prod_{p['id']}"))
        
    markup.add(InlineKeyboardButton("⬅️ Back to Categories", callback_data="menu_categories"))
    bot.edit_message_text(f"Products in **{category_name}**:", call.message.chat.id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')

# Handle Product Details
@bot.callback_query_handler(func=lambda call: call.data.startswith('prod_'))
def handle_product_selection(call):
    product_id = call.data.split('_')[1]
    products = get_products()
    
    product = next((p for p in products if p['id'] == product_id), None)
    if not product:
        bot.answer_callback_query(call.id, "Product not found.")
        return
        
    is_service = any(k in product.get('category', '').lower() for k in ['bot', 'web', 'software'])
    stock_count = len(product.get('stockAccounts', []))
    
    if not is_service and stock_count == 0:
        bot.answer_callback_query(call.id, "This product is currently out of stock!", show_alert=True)
        return
    
    caption = f"🛒 **{product['name']}**\n\n"
    caption += f"{product['description']}\n\n"
    if product.get('features'):
        caption += "**Features:**\n"
        for f in product['features']:
            caption += f"- {f}\n"
        caption += "\n"
        
    caption += f"💰 **Price:** ${product['price']}\n"
    caption += f"⏱️ **Delivery Time:** {product.get('deliveryTime', 'Instant')}\n"
    
    if not is_service:
        caption += f"📦 **Stock:** {stock_count} Available\n"
        
    markup = InlineKeyboardMarkup()
    markup.row(InlineKeyboardButton("💳 Buy Now", callback_data=f"buy_{product['id']}"))
    markup.row(InlineKeyboardButton("⬅️ Back to Category", callback_data=f"cat_{product.get('category')}"))
    
    bot.edit_message_text(caption, call.message.chat.id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')

def generate_qr_photo(qr_string):
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_string)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    bio = BytesIO()
    bio.name = 'qrcode.png'
    img.save(bio, 'PNG')
    bio.seek(0)
    return bio

user_custom_inputs = {}

def process_user_custom_input(message, product_id, original_msg_id):
    chat_id = message.chat.id
    user_id = message.from_user.id
    
    try: bot.delete_message(chat_id, message.message_id)
    except: pass

    if message.text and message.text.lower() == '/cancel':
        products = get_products()
        product = next((p for p in products if p['id'] == product_id), None)
        if product:
            bot.edit_message_text(f"❌ Purchase cancelled.", chat_id, original_msg_id, parse_mode='Markdown')
        return

    custom_val = message.text.strip() if message.text else ""
    if not custom_val:
        bot.edit_message_text("❌ Input cannot be empty. Please type your details or /cancel.", chat_id, original_msg_id, parse_mode='Markdown')
        bot.register_next_step_handler_by_chat_id(chat_id, process_user_custom_input, product_id, original_msg_id)
        return

    if user_id not in user_custom_inputs:
        user_custom_inputs[user_id] = {}
    user_custom_inputs[user_id][product_id] = custom_val

    # Re-trigger handle_buy_now with artificial call object
    call = type('obj', (object,), {
        'id': '0',
        'data': f"buy_{product_id}",
        'from_user': message.from_user,
        'message': type('msg', (object,), {'chat': type('chat', (object,), {'id': chat_id}), 'message_id': original_msg_id})()
    })()
    handle_buy_now(call)

def handle_successful_delivery(product_id, user_id, sent_msg=None, method="Balance"):
    products = get_products()
    product = next((p for p in products if p['id'] == product_id), None)
    if not product: return
        
    is_service = any(k in product.get('category', '').lower() for k in ['bot', 'web', 'software'])
    
    # Retrieve user custom input if required
    requirements = user_custom_inputs.get(user_id, {}).get(product_id)

    stock_account = None
    if not is_service:
        fresh_products = get_products()
        fresh_product = next((p for p in fresh_products if p['id'] == product_id), None)
        if 'stockAccounts' in fresh_product and len(fresh_product['stockAccounts']) > 0:
            stock_account = fresh_product['stockAccounts'].pop(0)
            save_products(fresh_products)
        else:
            if sent_msg:
                try: bot.edit_message_caption("❌ **Out of Stock!**\n\nSorry, this product went out of stock before your payment was finalized.", sent_msg.chat.id, sent_msg.message_id, parse_mode='Markdown')
                except Exception: pass
            return False

    # Save to user's orders history and sync with orders.json
    add_user_order(user_id, product['name'], product['price'], stock_account, is_service, requirements=requirements, product_id=product_id)

    # Clean up custom input buffer
    if user_id in user_custom_inputs:
        user_custom_inputs[user_id].pop(product_id, None)

    if sent_msg:
        try: bot.delete_message(sent_msg.chat.id, sent_msg.message_id)
        except Exception: pass
        
    try:
        user_msg = f"✅ **Payment Verified!**\n🎉 **Vault Unlocked!**\n\nThank you for purchasing **{product['name']}**!\n\n"
        if requirements:
            user_msg += f"📝 **Your Detail Received:** `{requirements}`\n\n"
        if is_service:
            user_msg += "Your payment is confirmed. Our team will contact you shortly to begin processing your service requirements."
        else:
            user_msg += "📦 **Here is your auto-delivered product:**\n\n"
            user_msg += f"`{stock_account}`\n\n"
            user_msg += "Enjoy your purchase! Thank you for trusting us.\n\n*(You can view this key anytime in 'My Orders')*"
        
        bot.send_message(user_id, user_msg, parse_mode='Markdown', reply_markup=build_main_menu())
    except Exception as e:
        print(f"Failed to deliver to user {user_id}: {e}")
        
    settings = get_settings()
    group_id = settings.get('groupId')
    if group_id:
        try:
            admin_msg = f"💰 **New Paid Sale!**\n\n👤 **User ID:** {user_id}\n🛒 **Product:** {product['name']}\n💵 **Paid:** ${product['price']}\n✅ **Method:** {method}"
            if requirements:
                admin_msg += f"\n📝 **Input/Email:** `{requirements}`"
            bot.send_message(group_id, admin_msg, parse_mode='Markdown')
        except Exception:
            pass
    return True

def poll_payment_status(sent_msg, tran_id, client_id, context):
    for _ in range(60): # 180 seconds
        time.sleep(3)
        try:
            res = requests.post('https://2008.site/payway/api/check-status', json={"tran_id": tran_id, "client_id": client_id}, timeout=10)
            meta = res.json().get('meta', {})
            
            if meta.get('payment_approved') or meta.get('finished'):
                if context['type'] == 'deposit':
                    amount = context['amount']
                    user_id = context['user_id']
                    new_bal = add_user_balance(user_id, amount)
                    try:
                        bot.delete_message(sent_msg.chat.id, sent_msg.message_id)
                        bot.send_message(sent_msg.chat.id, f"✅ **Deposit Successful!**\n\nAdded: `${amount:.2f}`\nNew Balance: `${new_bal:.2f}`", parse_mode='Markdown', reply_markup=build_main_menu())
                    except Exception:
                        pass
                elif context['type'] == 'purchase':
                    handle_successful_delivery(context['product_id'], context['user_id'], sent_msg, "KHQR API")
                return
        except Exception as e:
            pass
            
    # Timeout
    try:
        bot.delete_message(sent_msg.chat.id, sent_msg.message_id)
        bot.send_message(sent_msg.chat.id, "⏱️ **QR Code Expired**\n\nThis payment session has expired.", parse_mode='Markdown', reply_markup=build_main_menu())
    except Exception:
        pass


# Handle Buy Now (Payment Method Selection)
@bot.callback_query_handler(func=lambda call: call.data.startswith('buy_'))
def handle_buy_now(call):
    product_id = call.data.split('_')[1]
    products = get_products()
    product = next((p for p in products if p['id'] == product_id), None)
    if not product:
        try: bot.answer_callback_query(call.id, "Product not found.")
        except: pass
        return
        
    user_id = call.from_user.id
    user_input = user_custom_inputs.get(user_id, {}).get(product_id)

    # Check if product requires custom input (email/family invite details)
    if product.get('requiresInput') and not user_input:
        label = product.get('inputLabel') or "Email / Account details"
        placeholder = product.get('inputPlaceholder') or "yourname@email.com"
        
        prompt_text = f"📝 **Input Required for {product['name']}**\n\n"
        prompt_text += f"Please type your **{label}** below in chat:\n"
        prompt_text += f"*(Example: `{placeholder}`)*\n\n"
        prompt_text += "Or type `/cancel` to abort."
        
        bot.edit_message_text(prompt_text, call.message.chat.id, call.message.message_id, parse_mode='Markdown')
        bot.register_next_step_handler_by_chat_id(call.message.chat.id, process_user_custom_input, product_id, call.message.message_id)
        return

    user_bal = get_user_balance(call.from_user.id)
    
    caption = f"💳 **Checkout: {product['name']}**\n\n"
    if user_input:
        caption += f"📝 **Your Provided Info:** `{user_input}`\n\n"
    caption += f"**Total to Pay:** ${product['price']}\n"
    caption += f"**Your Balance:** ${user_bal:.2f}\n\n"
    caption += "How would you like to pay?"
    
    markup = InlineKeyboardMarkup()
    if user_bal >= product['price']:
        markup.row(InlineKeyboardButton(f"💰 Pay with Balance (${product['price']})", callback_data=f"paybal_{product['id']}_{product['price']}"))
    else:
        markup.row(InlineKeyboardButton("💰 Insufficient Balance", callback_data="insufficient_balance"))
        
    markup.row(InlineKeyboardButton("📱 Pay with KHQR App", callback_data=f"payqr_{product['id']}_{product['price']}"))
    markup.row(InlineKeyboardButton("🏷️ Apply Coupon Code", callback_data=f"applycoupon_{product['id']}"))
    markup.row(InlineKeyboardButton("⬅️ Cancel", callback_data=f"prod_{product['id']}"))
    
    bot.edit_message_text(caption, call.message.chat.id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')

@bot.callback_query_handler(func=lambda call: call.data == 'insufficient_balance')
def handle_insufficient(call):
    bot.answer_callback_query(call.id, "You don't have enough balance! Please deposit funds or pay with KHQR.", show_alert=True)

# Handle Coupon Button
@bot.callback_query_handler(func=lambda call: call.data.startswith('applycoupon_'))
def handle_apply_coupon_btn(call):
    product_id = call.data.split('_')[1]
    msg = bot.edit_message_text("🏷️ **Enter your Coupon Code:**\n\nType your coupon code below in the chat, or type `/cancel` to go back.", call.message.chat.id, call.message.message_id, parse_mode='Markdown')
    bot.register_next_step_handler(msg, process_coupon_code, product_id, msg.message_id)

def process_coupon_code(message, product_id, original_msg_id):
    chat_id = message.chat.id
    
    try: bot.delete_message(chat_id, message.message_id) # Delete user's reply
    except: pass

    if message.text.lower() == '/cancel':
        products = get_products()
        product = next((p for p in products if p['id'] == product_id), None)
        if product:
            call = type('obj', (object,), {'data': f"buy_{product['id']}", 'from_user': message.from_user, 'message': type('msg', (object,), {'chat': type('chat', (object,), {'id': chat_id}), 'message_id': original_msg_id})})()
            handle_buy_now(call)
        return

    code = message.text.strip().upper()
    coupons = get_coupons()
    coupon = next((c for c in coupons if c['code'] == code), None)

    products = get_products()
    product = next((p for p in products if p['id'] == product_id), None)
    if not product: return

    if not coupon:
        bot.edit_message_text(f"❌ **Invalid Coupon Code!**\n\nThe code `{code}` is not valid. Please try again or /cancel.", chat_id, original_msg_id, parse_mode='Markdown')
        bot.register_next_step_handler_by_chat_id(chat_id, process_coupon_code, product_id, original_msg_id)
        return

    discount = coupon['discountPercentage']
    original_price = product['price']
    new_price = round(original_price * (1 - discount / 100), 2)
    user_bal = get_user_balance(message.from_user.id)

    caption = f"💳 **Checkout: {product['name']}**\n\n"
    caption += f"**Original Price:** ~${original_price}~\n"
    caption += f"✅ **Coupon Applied:** {discount}% OFF (`{code}`)\n"
    caption += f"**Total to Pay:** ${new_price}\n"
    caption += f"**Your Balance:** ${user_bal:.2f}\n\n"
    caption += "How would you like to pay?"
    
    markup = InlineKeyboardMarkup()
    if user_bal >= new_price:
        markup.row(InlineKeyboardButton(f"💰 Pay with Balance (${new_price})", callback_data=f"paybal_{product['id']}_{new_price}"))
    else:
        markup.row(InlineKeyboardButton("💰 Insufficient Balance", callback_data="insufficient_balance"))
        
    markup.row(InlineKeyboardButton("📱 Pay with KHQR App", callback_data=f"payqr_{product['id']}_{new_price}"))
    markup.row(InlineKeyboardButton("⬅️ Cancel", callback_data=f"prod_{product['id']}"))
    
    bot.edit_message_text(caption, chat_id, original_msg_id, reply_markup=markup, parse_mode='Markdown')


# Handle Pay with Balance
@bot.callback_query_handler(func=lambda call: call.data.startswith('paybal_'))
def handle_pay_balance(call):
    parts = call.data.split('_')
    product_id = parts[1]
    
    # We retrieve the actual price that was presented on the button
    actual_price = float(parts[2]) if len(parts) > 2 else 0

    products = get_products()
    product = next((p for p in products if p['id'] == product_id), None)
    if not product: return
    
    if actual_price == 0:
        actual_price = product['price']

    bot.answer_callback_query(call.id)
    bot.delete_message(call.message.chat.id, call.message.message_id)
    
    if deduct_user_balance(call.from_user.id, actual_price):
        msg = bot.send_message(call.message.chat.id, "⏳ **Deducting balance and preparing your product...**", parse_mode='Markdown')
        handle_successful_delivery(product_id, call.from_user.id, msg, "Account Balance")
    else:
        bot.send_message(call.message.chat.id, "❌ **Transaction Failed:** Insufficient balance.")

# Helper to process QR payment logic
def process_payment_qr(chat_id, user_id, message_id_to_delete, amount, is_deposit=False, product_id=None, product_name=None):
    if message_id_to_delete:
        bot.delete_message(chat_id, message_id_to_delete)
        
    try:
        res = requests.post('https://2008.site/payway/api/create-qr', json={
            "url": "https://link.payway.com.kh/ABAPAYEA437661K",
            "amount": str(amount)
        }, timeout=10)
        
        data = res.json()
        qr_string = data.get('qr_string')
        tran_id = data.get('status', {}).get('tran_id')
        client_id = data.get('client_id')
        
        if not qr_string or not tran_id or not client_id:
            bot.send_message(chat_id, "❌ Error generating payment QR code.")
            return
            
        bio = generate_qr_photo(qr_string)
        
        if is_deposit:
            caption = f"💵 **Deposit Request**\n\n**Amount:** ${amount:.2f}\n\n⏳ Awaiting Payment...\nPlease scan this QR to add funds to your Telegram balance."
            context = {"type": "deposit", "amount": amount, "user_id": user_id}
        else:
            caption = f"💳 **Checkout: {product_name}**\n\n**Total to Pay:** ${amount}\n\n⏳ Awaiting Payment...\nPlease scan this QR. Product will be sent automatically!"
            context = {"type": "purchase", "product_id": product_id, "user_id": user_id}
            
        sent_msg = bot.send_photo(chat_id, bio, caption=caption, parse_mode='Markdown')
        threading.Thread(target=poll_payment_status, args=(sent_msg, tran_id, client_id, context)).start()
        
    except Exception as e:
        bot.send_message(chat_id, "❌ Payment Gateway is currently unavailable.")


# Handle Pay with KHQR (from Buttons)
@bot.callback_query_handler(func=lambda call: call.data.startswith('payqr_') or call.data.startswith('deposit_'))
def handle_api_payment(call):
    if call.data == 'deposit_custom':
        return # Handled by custom_deposit function
        
    user_id = call.from_user.id
    chat_id = call.message.chat.id
    message_id = call.message.message_id
    
    is_deposit = call.data.startswith('deposit_')
    amount = 0
    product_id = None
    product_name = None
    
    if is_deposit:
        amount = float(call.data.split('_')[1])
    else:
        parts = call.data.split('_')
        product_id = parts[1]
        
        products = get_products()
        product = next((p for p in products if p['id'] == product_id), None)
        if not product: return
        
        product_name = product['name']
        amount = float(parts[2]) if len(parts) > 2 else product['price']
        
    bot.answer_callback_query(call.id, "Generating Payment QR...")
    process_payment_qr(chat_id, user_id, message_id, amount, is_deposit, product_id, product_name)

print("Starting Telegram Bot with Orders and Custom Deposits...")
bot.infinity_polling()
