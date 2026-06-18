import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.dietitian import dietitian_bp
from routes.user import user_bp

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.register_blueprint(auth_bp,       url_prefix='/api/auth')
app.register_blueprint(admin_bp,      url_prefix='/api/admin')
app.register_blueprint(dietitian_bp,  url_prefix='/api/dietitian')
app.register_blueprint(user_bp,       url_prefix='/api/user')


@app.route('/api/health')
def health():
    return {'status': 'ok', 'service': 'SmartDiet API'}


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(debug=True, port=port)
