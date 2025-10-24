'''
Business: Управление рейтингом игроков и прохождением уровней
Args: event с httpMethod, body, queryStringParameters
Returns: JSON с данными рейтинга или результатом операции
'''

import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(database_url)
    
    if method == 'GET':
        action = event.get('queryStringParameters', {}).get('action', 'leaderboard')
        
        if action == 'leaderboard':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT nickname, total_stars, levels_completed, created_at
                    FROM players
                    ORDER BY total_stars DESC, levels_completed DESC
                    LIMIT 100
                """)
                players = cur.fetchall()
            
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'leaderboard': players}, default=str),
                'isBase64Encoded': False
            }
        
        elif action == 'player':
            nickname = event.get('queryStringParameters', {}).get('nickname', '')
            if not nickname:
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Nickname required'}),
                    'isBase64Encoded': False
                }
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT nickname, total_stars, levels_completed, created_at
                    FROM players
                    WHERE nickname = %s
                """, (nickname,))
                player = cur.fetchone()
            
            conn.close()
            
            if player:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'player': player}, default=str),
                    'isBase64Encoded': False
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Player not found'}),
                    'isBase64Encoded': False
                }
    
    elif method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        if action == 'complete_level':
            nickname = body_data.get('nickname', '').strip()
            level_id = body_data.get('level_id', '')
            level_name = body_data.get('level_name', '')
            difficulty = body_data.get('difficulty', 1)
            
            if not nickname or not level_id:
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Nickname and level_id required'}),
                    'isBase64Encoded': False
                }
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO players (nickname, total_stars, levels_completed)
                    VALUES (%s, 0, 0)
                    ON CONFLICT (nickname) DO NOTHING
                    RETURNING id
                """, (nickname,))
                result = cur.fetchone()
                
                if result:
                    player_id = result['id']
                else:
                    cur.execute("SELECT id FROM players WHERE nickname = %s", (nickname,))
                    player_id = cur.fetchone()['id']
                
                cur.execute("""
                    INSERT INTO level_completions (player_id, level_id, level_name, difficulty)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (player_id, level_id) DO NOTHING
                """, (player_id, level_id, level_name, difficulty))
                
                cur.execute("""
                    UPDATE players
                    SET total_stars = (
                        SELECT COALESCE(SUM(difficulty), 0)
                        FROM level_completions
                        WHERE player_id = %s
                    ),
                    levels_completed = (
                        SELECT COUNT(*)
                        FROM level_completions
                        WHERE player_id = %s
                    )
                    WHERE id = %s
                """, (player_id, player_id, player_id))
                
                conn.commit()
                
                cur.execute("""
                    SELECT nickname, total_stars, levels_completed
                    FROM players
                    WHERE id = %s
                """, (player_id,))
                updated_player = cur.fetchone()
            
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'player': updated_player}, default=str),
                'isBase64Encoded': False
            }
    
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
