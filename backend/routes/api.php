<?php

use App\Http\Controllers\TemplateController;
use Illuminate\Support\Facades\Route;

Route::get('/templates', [TemplateController::class, 'index']);
Route::post('/templates', [TemplateController::class, 'store']);