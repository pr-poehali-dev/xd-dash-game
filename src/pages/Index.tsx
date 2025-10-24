import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { toast } from '@/components/ui/use-toast';

type GameObject = {
  type: 'block' | 'spike' | 'finish';
  x: number;
  y: number;
  width: number;
  height: number;
};

type Level = {
  id: string;
  name: string;
  objects: GameObject[];
  difficulty: number;
  author: string;
  plays: number;
};

const PLAYER_SIZE = 30;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4;

const defaultLevels: Level[] = [
  {
    id: '1',
    name: 'First Steps',
    difficulty: 1,
    author: 'XD Dash',
    plays: 0,
    objects: [
      { type: 'block', x: 0, y: 370, width: 400, height: 30 },
      { type: 'block', x: 500, y: 370, width: 400, height: 30 },
      { type: 'spike', x: 420, y: 350, width: 30, height: 20 },
      { type: 'spike', x: 460, y: 350, width: 30, height: 20 },
      { type: 'finish', x: 850, y: 320, width: 40, height: 50 },
    ],
  },
  {
    id: '2',
    name: 'Jump Master',
    difficulty: 3,
    author: 'XD Dash',
    plays: 0,
    objects: [
      { type: 'block', x: 0, y: 370, width: 300, height: 30 },
      { type: 'block', x: 400, y: 300, width: 150, height: 30 },
      { type: 'spike', x: 350, y: 350, width: 30, height: 20 },
      { type: 'block', x: 650, y: 370, width: 300, height: 30 },
      { type: 'spike', x: 600, y: 350, width: 30, height: 20 },
      { type: 'finish', x: 900, y: 320, width: 40, height: 50 },
    ],
  },
  {
    id: '3',
    name: 'Spike Hell',
    difficulty: 5,
    author: 'XD Dash',
    plays: 0,
    objects: [
      { type: 'block', x: 0, y: 370, width: 200, height: 30 },
      { type: 'spike', x: 220, y: 350, width: 30, height: 20 },
      { type: 'spike', x: 260, y: 350, width: 30, height: 20 },
      { type: 'block', x: 300, y: 370, width: 200, height: 30 },
      { type: 'spike', x: 520, y: 350, width: 30, height: 20 },
      { type: 'block', x: 560, y: 370, width: 200, height: 30 },
      { type: 'spike', x: 780, y: 350, width: 30, height: 20 },
      { type: 'block', x: 820, y: 370, width: 200, height: 30 },
      { type: 'finish', x: 980, y: 320, width: 40, height: 50 },
    ],
  },
];

export default function Index() {
  const [screen, setScreen] = useState<'menu' | 'play' | 'editor' | 'custom'>('menu');
  const [levels, setLevels] = useState<Level[]>(defaultLevels);
  const [customLevels, setCustomLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [selectedObject, setSelectedObject] = useState<'block' | 'spike' | 'finish'>('block');
  const [editorObjects, setEditorObjects] = useState<GameObject[]>([]);
  const [levelName, setLevelName] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({ x: 50, y: 300, velocityY: 0, isJumping: false, isDead: false });
  const keysRef = useRef({ space: false });
  const animationRef = useRef<number>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        keysRef.current.space = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        keysRef.current.space = false;
      }
    };

    const handleClick = () => {
      keysRef.current.space = true;
      setTimeout(() => {
        keysRef.current.space = false;
      }, 100);
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      keysRef.current.space = true;
      setTimeout(() => {
        keysRef.current.space = false;
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleTouch, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  useEffect(() => {
    if (screen === 'play' && currentLevel && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      playerRef.current = { x: 50, y: 300, velocityY: 0, isJumping: false, isDead: false };

      const gameLoop = () => {
        const player = playerRef.current;
        
        if (player.isDead) {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 36px Rubik';
          ctx.textAlign = 'center';
          ctx.fillText('You Died! Press SPACE to restart', canvas.width / 2, canvas.height / 2);
          
          if (keysRef.current.space) {
            playerRef.current = { x: 50, y: 300, velocityY: 0, isJumping: false, isDead: false };
          }
          animationRef.current = requestAnimationFrame(gameLoop);
          return;
        }

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        player.x += MOVE_SPEED;

        player.velocityY += GRAVITY;
        player.y += player.velocityY;

        let onGround = false;
        currentLevel.objects.forEach((obj) => {
          if (obj.type === 'block') {
            ctx.fillStyle = '#1E40AF';
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

            if (
              player.x + PLAYER_SIZE > obj.x &&
              player.x < obj.x + obj.width &&
              player.y + PLAYER_SIZE > obj.y &&
              player.y < obj.y + obj.height
            ) {
              if (player.velocityY > 0) {
                player.y = obj.y - PLAYER_SIZE;
                player.velocityY = 0;
                onGround = true;
                player.isJumping = false;
              }
            }
          } else if (obj.type === 'spike') {
            ctx.fillStyle = '#DC2626';
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y + obj.height);
            ctx.lineTo(obj.x + obj.width / 2, obj.y);
            ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
            ctx.closePath();
            ctx.fill();

            if (
              player.x + PLAYER_SIZE > obj.x &&
              player.x < obj.x + obj.width &&
              player.y + PLAYER_SIZE > obj.y &&
              player.y < obj.y + obj.height
            ) {
              player.isDead = true;
              toast({
                title: "💀 Game Over",
                description: "You hit a spike! Try again.",
                variant: "destructive",
              });
            }
          } else if (obj.type === 'finish') {
            ctx.fillStyle = '#FBBF24';
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 24px Rubik';
            ctx.textAlign = 'center';
            ctx.fillText('★', obj.x + obj.width / 2, obj.y + 30);

            if (
              player.x + PLAYER_SIZE > obj.x &&
              player.x < obj.x + obj.width &&
              player.y + PLAYER_SIZE > obj.y &&
              player.y < obj.y + obj.height
            ) {
              toast({
                title: "🎉 Level Complete!",
                description: "Amazing job! Try the next level.",
              });
              setScreen('menu');
              return;
            }
          }
        });

        if (keysRef.current.space && !player.isJumping && onGround) {
          player.velocityY = JUMP_FORCE;
          player.isJumping = true;
        }

        if (player.y > canvas.height) {
          player.isDead = true;
          toast({
            title: "💀 Fell Off",
            description: "You fell into the void!",
            variant: "destructive",
          });
        }

        ctx.fillStyle = '#1E40AF';
        ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Rubik';
        ctx.textAlign = 'left';
        ctx.fillText(`Level: ${currentLevel.name}`, 10, 30);
        ctx.fillText(`Tap or press SPACE to jump`, 10, 50);

        animationRef.current = requestAnimationFrame(gameLoop);
      };

      gameLoop();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [screen, currentLevel]);

  const handlePlayLevel = (level: Level) => {
    setCurrentLevel(level);
    setScreen('play');
    setLevels(prev => prev.map(l => l.id === level.id ? { ...l, plays: l.plays + 1 } : l));
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 40) * 40;
    const y = Math.floor((e.clientY - rect.top) / 40) * 40;

    const newObject: GameObject = {
      type: selectedObject,
      x,
      y,
      width: selectedObject === 'finish' ? 40 : selectedObject === 'spike' ? 30 : 80,
      height: selectedObject === 'finish' ? 50 : selectedObject === 'spike' ? 20 : 30,
    };

    setEditorObjects([...editorObjects, newObject]);
  };

  const handleSaveLevel = () => {
    if (!levelName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a level name",
        variant: "destructive",
      });
      return;
    }

    if (editorObjects.length === 0) {
      toast({
        title: "Error",
        description: "Please add some objects to the level",
        variant: "destructive",
      });
      return;
    }

    const estimatedDifficulty = Math.min(10, Math.max(1, Math.floor(
      editorObjects.filter(o => o.type === 'spike').length / 2 + 1
    )));

    const newLevel: Level = {
      id: `custom-${Date.now()}`,
      name: levelName,
      objects: editorObjects,
      difficulty: estimatedDifficulty,
      author: 'Player',
      plays: 0,
    };

    setCustomLevels([...customLevels, newLevel]);
    toast({
      title: "✅ Level Saved!",
      description: `"${levelName}" is now available in Custom Levels`,
    });
    
    setLevelName('');
    setEditorObjects([]);
    setScreen('custom');
  };

  useEffect(() => {
    if (screen === 'editor' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#1E40AF33';
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        editorObjects.forEach((obj) => {
          if (obj.type === 'block') {
            ctx.fillStyle = '#1E40AF';
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
          } else if (obj.type === 'spike') {
            ctx.fillStyle = '#DC2626';
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y + obj.height);
            ctx.lineTo(obj.x + obj.width / 2, obj.y);
            ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
            ctx.closePath();
            ctx.fill();
          } else if (obj.type === 'finish') {
            ctx.fillStyle = '#FBBF24';
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
          }
        });

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Rubik';
        ctx.fillText('Click to place objects', 10, 30);
      };

      draw();
    }
  }, [screen, editorObjects, selectedObject]);

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E40AF] to-[#0EA5E9] flex items-center justify-center p-4">
        <div className="text-center space-y-8 animate-fade-in">
          <h1 className="text-7xl font-black text-white tracking-tight" style={{ textShadow: '4px 4px 0px #0F172A' }}>
            XD DASH
          </h1>
          
          <div className="space-y-4 max-w-md mx-auto">
            <Button 
              onClick={() => setScreen('play')}
              className="w-full h-16 text-2xl font-bold bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white shadow-lg hover:scale-105 transition-transform"
              style={{ clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' }}
            >
              <Icon name="Play" className="mr-2" size={28} />
              ИГРАТЬ
            </Button>
            
            <Button 
              onClick={() => setScreen('editor')}
              className="w-full h-14 text-xl font-semibold bg-transparent border-4 border-[#1E40AF] text-white hover:bg-[#1E40AF]/20"
            >
              <Icon name="Pencil" className="mr-2" size={24} />
              РЕДАКТОР
            </Button>
            
            <Button 
              onClick={() => setScreen('custom')}
              className="w-full h-14 text-xl font-semibold bg-transparent border-4 border-[#1E40AF] text-white hover:bg-[#1E40AF]/20"
            >
              <Icon name="Users" className="mr-2" size={24} />
              ПОЛЬЗОВАТЕЛЬСКИЕ УРОВНИ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'play') {
    if (!currentLevel) {
      return (
        <div className="min-h-screen bg-[#0F172A] p-8">
          <div className="max-w-6xl mx-auto">
            <Button 
              onClick={() => setScreen('menu')}
              variant="outline"
              className="mb-6 border-[#1E40AF] text-white hover:bg-[#1E40AF]/20"
            >
              <Icon name="ArrowLeft" className="mr-2" size={20} />
              Назад в меню
            </Button>
            
            <h2 className="text-4xl font-bold text-white mb-8">Выбери уровень</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {levels.map((level) => (
                <Card 
                  key={level.id}
                  className="bg-[#1E293B] border-[#1E40AF] p-6 hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => handlePlayLevel(level)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-white">{level.name}</h3>
                    <div className="flex">
                      {Array.from({ length: level.difficulty }).map((_, i) => (
                        <span key={i} className="text-[#FBBF24] text-xl">★</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-gray-400">
                    <p>Автор: {level.author}</p>
                    <p>Прохождений: {level.plays}</p>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white font-bold"
                    style={{ clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)' }}
                  >
                    <Icon name="Play" className="mr-2" size={20} />
                    ИГРАТЬ
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0F172A] p-4">
        <div className="max-w-5xl mx-auto">
          <Button 
            onClick={() => {
              setCurrentLevel(null);
              setScreen('play');
            }}
            variant="outline"
            className="mb-4 border-[#1E40AF] text-white hover:bg-[#1E40AF]/20"
          >
            <Icon name="ArrowLeft" className="mr-2" size={20} />
            Назад к уровням
          </Button>
          
          <canvas
            ref={canvasRef}
            width={1000}
            height={400}
            className="border-4 border-[#1E40AF] rounded-lg shadow-2xl w-full"
          />
        </div>
      </div>
    );
  }

  if (screen === 'editor') {
    return (
      <div className="min-h-screen bg-[#0F172A] p-8">
        <div className="max-w-6xl mx-auto">
          <Button 
            onClick={() => setScreen('menu')}
            variant="outline"
            className="mb-6 border-[#1E40AF] text-white hover:bg-[#1E40AF]/20"
          >
            <Icon name="ArrowLeft" className="mr-2" size={20} />
            Назад в меню
          </Button>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <Card className="lg:col-span-1 bg-[#1E293B] border-[#1E40AF] p-4">
              <h3 className="text-xl font-bold text-white mb-4">Палитра объектов</h3>
              
              <div className="space-y-3">
                <Button
                  onClick={() => setSelectedObject('block')}
                  className={`w-full justify-start ${
                    selectedObject === 'block' 
                      ? 'bg-[#1E40AF] text-white' 
                      : 'bg-[#0F172A] text-gray-400 hover:bg-[#1E40AF]/20'
                  }`}
                >
                  <div className="w-6 h-6 bg-[#1E40AF] mr-3 border-2 border-white" />
                  Блок
                </Button>
                
                <Button
                  onClick={() => setSelectedObject('spike')}
                  className={`w-full justify-start ${
                    selectedObject === 'spike' 
                      ? 'bg-[#1E40AF] text-white' 
                      : 'bg-[#0F172A] text-gray-400 hover:bg-[#1E40AF]/20'
                  }`}
                >
                  <div className="w-6 h-6 mr-3">
                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-red-600" />
                  </div>
                  Шип
                </Button>
                
                <Button
                  onClick={() => setSelectedObject('finish')}
                  className={`w-full justify-start ${
                    selectedObject === 'finish' 
                      ? 'bg-[#1E40AF] text-white' 
                      : 'bg-[#0F172A] text-gray-400 hover:bg-[#1E40AF]/20'
                  }`}
                >
                  <div className="w-6 h-6 bg-[#FBBF24] mr-3 flex items-center justify-center text-black font-bold">
                    ★
                  </div>
                  Финиш
                </Button>
              </div>
              
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => setEditorObjects([])}
                  variant="destructive"
                  className="w-full"
                >
                  <Icon name="Trash2" className="mr-2" size={16} />
                  Очистить
                </Button>
              </div>
            </Card>
            
            <div className="lg:col-span-3 space-y-4">
              <canvas
                ref={canvasRef}
                width={1000}
                height={400}
                onClick={handleEditorClick}
                className="border-4 border-[#1E40AF] rounded-lg shadow-2xl cursor-crosshair w-full"
              />
              
              <Card className="bg-[#1E293B] border-[#1E40AF] p-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-white font-semibold mb-2 block">Название уровня</label>
                    <Input
                      value={levelName}
                      onChange={(e) => setLevelName(e.target.value)}
                      placeholder="Введи крутое название..."
                      className="bg-[#0F172A] border-[#1E40AF] text-white"
                    />
                  </div>
                  
                  <Button
                    onClick={handleSaveLevel}
                    className="bg-[#FBBF24] hover:bg-[#FBBF24]/90 text-black font-bold h-10"
                  >
                    <Icon name="Save" className="mr-2" size={20} />
                    Сохранить уровень
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'custom') {
    return (
      <div className="min-h-screen bg-[#0F172A] p-8">
        <div className="max-w-6xl mx-auto">
          <Button 
            onClick={() => setScreen('menu')}
            variant="outline"
            className="mb-6 border-[#1E40AF] text-white hover:bg-[#1E40AF]/20"
          >
            <Icon name="ArrowLeft" className="mr-2" size={20} />
            Назад в меню
          </Button>
          
          <h2 className="text-4xl font-bold text-white mb-8">Пользовательские уровни</h2>
          
          {customLevels.length === 0 ? (
            <Card className="bg-[#1E293B] border-[#1E40AF] p-12 text-center">
              <Icon name="Inbox" className="mx-auto mb-4 text-gray-500" size={64} />
              <p className="text-2xl text-gray-400 mb-2">Пока нет уровней</p>
              <p className="text-gray-500 mb-6">Создай свой первый уровень в редакторе!</p>
              <Button
                onClick={() => setScreen('editor')}
                className="bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white"
              >
                <Icon name="Pencil" className="mr-2" size={20} />
                Открыть редактор
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customLevels.map((level) => (
                <Card 
                  key={level.id}
                  className="bg-[#1E293B] border-[#1E40AF] p-6 hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => {
                    setCurrentLevel(level);
                    setScreen('play');
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-white">{level.name}</h3>
                    <div className="flex">
                      {Array.from({ length: level.difficulty }).map((_, i) => (
                        <span key={i} className="text-[#FBBF24] text-xl">★</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-gray-400">
                    <p>Автор: {level.author}</p>
                    <p>Прохождений: {level.plays}</p>
                    <p className="text-[#1E40AF] font-semibold">Пользовательский</p>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white font-bold"
                    style={{ clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)' }}
                  >
                    <Icon name="Play" className="mr-2" size={20} />
                    ИГРАТЬ
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}