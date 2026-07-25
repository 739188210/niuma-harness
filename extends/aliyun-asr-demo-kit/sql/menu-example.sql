-- 可选：菜单系统示例。按目标项目菜单表结构调整字段。
INSERT INTO system_menu
(name, permission, type, sort, parent_id, path, icon, component, component_name, status, visible, create_time, update_time, deleted)
VALUES
('阿里云语音识别', 'aliyun-asr-demo:use', 2, 1, 0, 'aliyun-asr-demo',
 'ep:microphone', 'AliyunAsrDemo', 'AliyunAsrDemo', 0, b'1', NOW(), NOW(), b'0');
