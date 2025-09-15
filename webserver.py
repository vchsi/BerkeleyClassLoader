from flask import Flask, jsonify, request
import logging

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify(message="Welcome to the Berkeley Class Scheduler API!")

if(__name__ == '__main__'):
    app.run(debug=True)