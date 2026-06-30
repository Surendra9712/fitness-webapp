import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.dietitian import dietitian_bp
from routes.user import user_bp
from routes.public import public_bp
from routes.onboarding import onboarding_bp
from routes.payment import payment_bp
from routes.upload import upload_bp
from routes.notifications import notifications_bp

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.register_blueprint(auth_bp,       url_prefix='/api/auth')
app.register_blueprint(admin_bp,      url_prefix='/api/admin')
app.register_blueprint(dietitian_bp,  url_prefix='/api/dietitian')
app.register_blueprint(user_bp,       url_prefix='/api/user')
app.register_blueprint(public_bp,     url_prefix='/api/public')
app.register_blueprint(onboarding_bp, url_prefix='/api/onboarding')
app.register_blueprint(payment_bp,    url_prefix='/api/payments')
app.register_blueprint(upload_bp,          url_prefix='/api/upload')
app.register_blueprint(notifications_bp,  url_prefix='/api/notifications')


@app.route('/api/health')
def health():
    return {'status': 'ok', 'service': 'SmartDiet API'}


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(debug=True, port=port)
