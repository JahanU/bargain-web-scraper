export interface TelegramUpdate {
    update_id: number;
    message?: Message;
    date: number;
    text: string,
    entities: string[],
    response_to_user: string // new
}

export interface Message {
    message_id: number,
    from: User,
    sender_chat: Chat,
    date: number,
    chat: Chat,
    forward_from: User,
    forward_from_chat: Chat,
    text: string,
}

export interface User {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
}

export interface Chat {
    id: number,
    first_name: string,
    last_name: string,
    type: string,
}
