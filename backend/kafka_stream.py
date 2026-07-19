import json
import logging
import asyncio
from typing import Callable, List, Dict
from . import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KafkaStream")

class MockKafkaProducer:
    """Fallback mock Kafka producer when Kafka is disabled."""
    def send(self, topic: str, value: dict):
        logger.info(f"[Mock Kafka Producer] Sent to '{topic}': {value}")
        # Dispatch to the mock consumer broker
        KafkaStreamManager.dispatch_mock_message(topic, value)

class MockKafkaConsumer:
    """Fallback mock Kafka consumer when Kafka is disabled."""
    def __init__(self, topics: List[str]):
        self.topics = topics

    async def consume_loop(self, callback: Callable[[str, dict], None]):
        logger.info(f"[Mock Kafka Consumer] Listening to topics: {self.topics}")
        while True:
            # Check for simulated messages
            for topic in self.topics:
                messages = KafkaStreamManager.get_mock_messages(topic)
                for msg in messages:
                    await callback(topic, msg)
            await asyncio.sleep(0.1)

class KafkaStreamManager:
    # Subscriber registry for WebSocket/WebSocket manager broadcasts
    loop = None
    subscribers: List[Callable[[str, dict], None]] = []
    
    # Internal message buffers for fallback simulation
    mock_queues: Dict[str, List[dict]] = {
        "traffic": [],
        "crowd": [],
        "aqi": [],
        "ambulance": [],
        "alerts": []
    }

    _producer = None
    _consumer = None

    @classmethod
    def get_producer(cls):
        if cls._producer is not None:
            return cls._producer

        if config.ENABLE_KAFKA:
            try:
                from kafka import KafkaProducer
                cls._producer = KafkaProducer(
                    bootstrap_servers=config.KAFKA_BOOTSTRAP_SERVERS,
                    value_serializer=lambda v: json.dumps(v).encode('utf-8')
                )
                logger.info("Kafka Producer successfully initialized.")
                return cls._producer
            except Exception as e:
                logger.error(f"Failed to initialize real Kafka Producer: {e}. Falling back to Mock.")
        
        cls._producer = MockKafkaProducer()
        return cls._producer

    @classmethod
    def register_subscriber(cls, callback: Callable[[str, dict], None]):
        if callback not in cls.subscribers:
            cls.subscribers.append(callback)
            logger.info("New WebSocket subscriber registered for Kafka streams.")

    @classmethod
    def unregister_subscriber(cls, callback: Callable[[str, dict], None]):
        if callback in cls.subscribers:
            cls.subscribers.remove(callback)
            logger.info("WebSocket subscriber unregistered.")

    @classmethod
    def dispatch_mock_message(cls, topic: str, value: dict):
        # 1. Enqueue in mock broker queues
        if topic in cls.mock_queues:
            cls.mock_queues[topic].append(value)
            # Limit queue size
            if len(cls.mock_queues[topic]) > 100:
                cls.mock_queues[topic].pop(0)

        # 2. Directly broadcast to registered subscribers (web sockets) in real-time
        for sub in cls.subscribers:
            try:
                if asyncio.iscoroutinefunction(sub):
                    if cls.loop and cls.loop.is_running():
                        asyncio.run_coroutine_threadsafe(sub(topic, value), cls.loop)
                    else:
                        try:
                            # Try standard task creation if on main thread
                            asyncio.create_task(sub(topic, value))
                        except RuntimeError:
                            # Fallback if no loop on current thread (will be picked up by consumer loop anyway)
                            pass
                else:
                    sub(topic, value)
            except Exception as e:
                logger.error(f"Error dispatching stream event to subscriber: {e}")

    @classmethod
    def get_mock_messages(cls, topic: str) -> List[dict]:
        if topic in cls.mock_queues and len(cls.mock_queues[topic]) > 0:
            msgs = cls.mock_queues[topic].copy()
            cls.mock_queues[topic].clear()
            return msgs
        return []

    @classmethod
    def publish_event(cls, topic: str, data: dict):
        producer = cls.get_producer()
        if hasattr(producer, 'send'):
            producer.send(topic, data)
        else:
            # real kafka-python uses send(topic, value)
            try:
                producer.send(topic, value=data)
            except Exception as e:
                logger.error(f"Error sending message to Kafka: {e}")
                # Fallback to dispatching locally
                cls.dispatch_mock_message(topic, data)

    @classmethod
    async def start_consumer(cls, topics: List[str], ws_callback: Callable[[str, dict], None]):
        """Starts a background task to consume messages and route them to WebSockets."""
        if config.ENABLE_KAFKA:
            try:
                from kafka import KafkaConsumer
                cls._consumer = KafkaConsumer(
                    *topics,
                    bootstrap_servers=config.KAFKA_BOOTSTRAP_SERVERS,
                    value_deserializer=lambda x: json.loads(x.decode('utf-8')),
                    auto_offset_reset='latest',
                    enable_auto_commit=True
                )
                logger.info("Kafka Consumer successfully initialized.")
                
                # Real Kafka loop in executor since it blocks
                loop = asyncio.get_running_loop()
                def consume():
                    for message in cls._consumer:
                        topic = message.topic
                        val = message.value
                        logger.info(f"[Real Kafka Consumer] Received on '{topic}': {val}")
                        # Execute the websocket callback in the event loop
                        asyncio.run_coroutine_threadsafe(ws_callback(topic, val), loop)

                import threading
                t = threading.Thread(target=consume, daemon=True)
                t.start()
                return
            except Exception as e:
                logger.error(f"Failed to initialize real Kafka Consumer: {e}. Falling back to Mock.")

        # Fallback Mock Consumer
        cls.register_subscriber(ws_callback)
        mock_cons = MockKafkaConsumer(topics)
        asyncio.create_task(mock_cons.consume_loop(ws_callback))
