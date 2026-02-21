-- Seed business units (offices)
INSERT INTO business_units (name, city, address, lat, lon) VALUES
    ('Офис Астана', 'Astana', 'пр. Мангилик Ел, 55/20', 51.1694, 71.4491),
    ('Офис Алматы', 'Almaty', 'пр. Аль-Фараби, 77/7', 43.2220, 76.8512)
ON CONFLICT (name) DO NOTHING;

-- Seed managers
INSERT INTO managers (full_name, email, business_unit_id, is_vip_skill, is_chief_spec, languages) VALUES
    -- Astana office
    ('Айдана Сериккызы', 'aidana@fire.kz', (SELECT id FROM business_units WHERE city = 'Astana'), true, false, '{RU,KZ}'),
    ('Болат Темиров', 'bolat@fire.kz', (SELECT id FROM business_units WHERE city = 'Astana'), false, true, '{RU}'),
    ('Сауле Нурланова', 'saule@fire.kz', (SELECT id FROM business_units WHERE city = 'Astana'), true, false, '{RU,ENG}'),
    ('Ерлан Жумабеков', 'erlan@fire.kz', (SELECT id FROM business_units WHERE city = 'Astana'), false, false, '{RU,KZ}'),
    ('Динара Касымова', 'dinara@fire.kz', (SELECT id FROM business_units WHERE city = 'Astana'), false, false, '{RU}'),
    -- Almaty office
    ('Марат Кенжебаев', 'marat@fire.kz', (SELECT id FROM business_units WHERE city = 'Almaty'), true, false, '{RU,KZ,ENG}'),
    ('Алия Назарбекова', 'aliya@fire.kz', (SELECT id FROM business_units WHERE city = 'Almaty'), false, true, '{RU}'),
    ('Дана Рахимова', 'dana@fire.kz', (SELECT id FROM business_units WHERE city = 'Almaty'), true, false, '{RU,ENG}'),
    ('Арман Токаев', 'arman@fire.kz', (SELECT id FROM business_units WHERE city = 'Almaty'), false, false, '{RU,KZ}'),
    ('Жанна Муратова', 'zhanna@fire.kz', (SELECT id FROM business_units WHERE city = 'Almaty'), false, false, '{RU}')
ON CONFLICT (email) DO NOTHING;
