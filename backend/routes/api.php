<?php

use App\Http\Controllers\TemplateController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SyncController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LetterController;
use App\Http\Controllers\UserController;

Route::post('/login', [AuthController::class, 'login']);

Route::get('/templates', [TemplateController::class, 'index']);
Route::get('/templates/{template}', [TemplateController::class, 'show']);
Route::post('/templates', [TemplateController::class, 'store']);

Route::get('/letters', [LetterController::class, 'index']);
Route::post('/letters', [LetterController::class, 'store']);
Route::get('/letters/{letter}', [LetterController::class, 'show']);


Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    
    Route::prefix('sync')->group(function () {
        Route::post('csv', [SyncController::class, 'csv']);
    });

    Route::prefix('user')->group(function(){
        Route::post('signature', [UserController::class, 'uploadSignature']);
        Route::get('signature', [UserController::class, 'getSignature']);
    });

});